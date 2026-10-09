package com.mambesi.action.payment;

import com.mambesi.action.common.Money;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.InetAddress;
import java.net.URI;
import java.net.URLDecoder;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.util.*;

@Component
public class PayfastClient {
    @Value("${payfast.merchant-id}") private String merchantId;
    @Value("${payfast.merchant-key}") private String merchantKey;
    @Value("${payfast.passphrase:}") private String passphrase;
    @Value("${payfast.sandbox:true}") private boolean sandbox;
    @Value("${payfast.return-url}") private String returnUrl;
    @Value("${payfast.cancel-url}") private String cancelUrl;
    @Value("${payfast.notify-url}") private String notifyUrl;
    @Value("${marketplace.live-approved:false}") private boolean liveApproved;
    @Value("${payfast.trusted-proxy-addresses:}") private String trustedProxies;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(8)).followRedirects(HttpClient.Redirect.NEVER).build();
    public boolean isSandbox(){return sandbox;}
    public void requireCheckoutAllowed(){if(!sandbox && !liveApproved)throw new IllegalStateException("Live payments are not enabled for this marketplace. Use the sandbox until the provider arrangement is approved.");}
    public String checkout(Payment p){
        requireCheckoutAllowed();LinkedHashMap<String,String> fields=new LinkedHashMap<>();
        fields.put("merchant_id",merchantId);fields.put("merchant_key",merchantKey);
        fields.put("return_url",returnUrl+(returnUrl.contains("?")?"&":"?")+"auction_id="+p.getAuctionItem().getId());
        fields.put("cancel_url",cancelUrl);fields.put("notify_url",notifyUrl);
        String[] names=p.getBuyer().getFullName().trim().split("\s+",2);
        fields.put("name_first",names[0]);if(names.length>1)fields.put("name_last",names[1]);
        fields.put("email_address",p.getBuyer().getEmail());fields.put("m_payment_id",p.getId().toString());
        fields.put("amount",Money.value(p.getTotalAmount()).toPlainString());
        fields.put("item_name",p.getOrder().getListingTitle().substring(0,Math.min(100,p.getOrder().getListingTitle().length())));
        fields.put("item_description","ConnSB order payment");String encoded=encode(fields,true);
        String signature=sign(encoded,passphrase);return host()+"/eng/process?"+encoded+"&signature="+signature;
    }
    public LinkedHashMap<String,String> parse(String body){
        if(body==null || body.isBlank() || body.length()>20000)
            throw new IllegalArgumentException("Invalid payment notification.");

        LinkedHashMap<String,String> result=new LinkedHashMap<>();
        for(String pair:body.split("&")){
            String[] kv=pair.split("=",2);if(kv.length!=2)throw new IllegalArgumentException("Malformed payment notification.");
            String key=URLDecoder.decode(kv[0],StandardCharsets.UTF_8);String value=URLDecoder.decode(kv[1],StandardCharsets.UTF_8);
            if(result.putIfAbsent(key,value)!=null)throw new IllegalArgumentException("Duplicate notification field.");
        }
        return result;
    }
    public void validate(LinkedHashMap<String,String> fields,String remoteAddress,String forwardedFor,double expected){
        String encoded=encode(fields,false);String signature=fields.get("signature");
        if(signature==null || !MessageDigest.isEqual(sign(encoded,passphrase).getBytes(StandardCharsets.US_ASCII),signature.toLowerCase(Locale.ROOT).getBytes(StandardCharsets.US_ASCII)))throw new SecurityException("Invalid notification signature.");
        if(!merchantId.equals(fields.get("merchant_id")))throw new SecurityException("Incorrect payment merchant.");
        try { if(Money.value(expected).compareTo(new java.math.BigDecimal(fields.get("amount_gross")))!=0)throw new SecurityException("Payment amount does not match the order."); }
        catch(NumberFormatException|NullPointerException e){throw new IllegalArgumentException("Invalid notification amount.");}
        String sender=remoteAddress;
        Set<String> trusted=new HashSet<>();for(String ip:trustedProxies.split(","))if(!ip.isBlank())trusted.add(ip.trim());
        if(trusted.contains(remoteAddress) && forwardedFor!=null){
            String[] chain=forwardedFor.split(",");for(int i=chain.length-1;i>=0;i--){sender=chain[i].trim();if(!trusted.contains(sender))break;}
        }
        Set<String> valid=new HashSet<>();
        try {
            // Include Payfast's published network addresses in both environments.
            List<String> sourceHosts = sandbox
                    ? List.of(
                    "ips.payfast.co.za",
                    "sandbox.payfast.co.za"
            )
                    : List.of(
                    "ips.payfast.co.za",
                    "www.payfast.co.za",
                    "w1w.payfast.co.za",
                    "w2w.payfast.co.za"
            );

            for (String domain : sourceHosts) {
                for (InetAddress ip : InetAddress.getAllByName(domain)) {
                    valid.add(ip.getHostAddress());
                }
            }

            if (!valid.contains(sender)) {
                // Log addresses only—not payment details, signatures or credentials.
                String safeForwardedFor = forwardedFor == null
                        ? "(absent)"
                        : forwardedFor.replaceAll("[^0-9a-fA-F:., ]", "?");

                if (safeForwardedFor.length() > 500) {
                    safeForwardedFor = safeForwardedFor.substring(0, 500);
                }

                org.slf4j.LoggerFactory.getLogger(PayfastClient.class).warn(
                        "Payfast ITN source mismatch: remoteAddress={}, "
                                + "forwardedFor={}, selectedSender={}, allowedAddresses={}",
                        remoteAddress,
                        safeForwardedFor,
                        sender,
                        valid
                );

                throw new SecurityException(
                        "Notification source is not a verified PayFast address."
                );
            }

            HttpRequest request=HttpRequest.newBuilder(URI.create(host()+"/eng/query/validate")).timeout(Duration.ofSeconds(12))
                .header("Content-Type","application/x-www-form-urlencoded").POST(HttpRequest.BodyPublishers.ofString(encoded)).build();
            HttpResponse<String> response=http.send(request,HttpResponse.BodyHandlers.ofString());
            if(response.statusCode()!=200 || !"VALID".equals(response.body().trim()))throw new SecurityException("Provider did not validate the notification.");
        }catch(InterruptedException e){Thread.currentThread().interrupt();throw new IllegalStateException("Payment validation interrupted; retry required.",e);}
        catch(java.io.IOException e){throw new IllegalStateException("Payment provider validation unavailable; retry required.",e);}
    }
    private String host(){return sandbox?"https://sandbox.payfast.co.za":"https://www.payfast.co.za";}
    public static String encode(Map<String,String> fields,boolean omitBlank){
        StringJoiner result=new StringJoiner("&");
        fields.forEach((key,value)->{if(!"signature".equals(key) && value!=null && (!omitBlank || !value.isBlank()))result.add(key+"="+URLEncoder.encode(value.trim(),StandardCharsets.UTF_8));});
        return result.toString();
    }
    public static String sign(String encoded,String passphrase){
        String data=encoded+(passphrase==null || passphrase.isBlank()?"":"&passphrase="+URLEncoder.encode(passphrase.trim(),StandardCharsets.UTF_8));
        try{return HexFormat.of().formatHex(MessageDigest.getInstance("MD5").digest(data.getBytes(StandardCharsets.UTF_8)));}
        catch(NoSuchAlgorithmException e){throw new IllegalStateException(e);}
    }
}
