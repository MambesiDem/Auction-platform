package com.mambesi.action.payment;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.delivery.DeliveryRepository;
import com.mambesi.action.delivery.DeliveryStatus;
import com.mambesi.action.payment.dto.PaymentResponse;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.scheduling.annotation.Async;
//import java.util.concurrent.TimeUnit;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    private final DeliveryRepository deliveryRepository;
    private final TaskScheduler taskScheduler;

    @Value("${payfast.merchant-id}")
    private String merchantId;

    @Value("${payfast.merchant-key}")
    private String merchantKey;

    @Value("${payfast.passphrase}")
    private String passphrase;

    @Value("${payfast.sandbox}")
    private boolean sandbox;

    @Value("${payfast.return-url}")
    private String returnUrl;

    @Value("${payfast.cancel-url}")
    private String cancelUrl;

    @Value("${payfast.notify-url}")
    private String notifyUrl;

    @Value("${platform.commission}")
    private double commissionRate;

    public PaymentService(PaymentRepository paymentRepository,
                          AuctionRepository auctionRepository,
                          UserRepository userRepository, DeliveryRepository deliveryRepository, TaskScheduler taskScheduler) {
        this.paymentRepository = paymentRepository;
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
        this.deliveryRepository = deliveryRepository;
        this.taskScheduler = taskScheduler;
    }

    @Async
    public void scheduleRelease(UUID auctionId) {
        try {
            taskScheduler.schedule(
                    () -> releasePayment(auctionId),
                    new Date(System.currentTimeMillis() + 5 * 60 * 1000)   //release it after 5 minutes
            );
            System.out.println("Payment auto-released for auction: " + auctionId);
        } catch (Exception e) {
            System.out.println("Payment release failed for auction: " + auctionId + " - " + e.getMessage());
        }
    }

    // Create a payment record and return the PayFast redirect URL
    public String initiatePayment(UUID auctionId, String buyerEmail) {

        AuctionItem auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (auction.isActive()) {
            throw new RuntimeException("Auction is still active.");
        }

        if (auction.getWinner() == null) {
            throw new RuntimeException("No winner for this auction.");
        }

        if (!auction.getWinner().getEmail().equals(buyerEmail)) {
            throw new RuntimeException("You are not the winner of this auction.");
        }

        // Check if payment already exists
        Optional<Payment> existing = paymentRepository.findByAuctionItemId(auctionId);
        if (existing.isPresent() && existing.get().getStatus() != PaymentStatus.FAILED) {
            throw new RuntimeException("Payment already initiated for this auction.");
        }

        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new RuntimeException("Buyer not found"));

        double total = auction.getCurrentPrice();
        double commission = Math.round(total * commissionRate * 100.0) / 100.0;
        double sellerAmount = Math.round((total - commission) * 100.0) / 100.0;

        Payment payment = new Payment();
        payment.setAuctionItem(auction);
        payment.setBuyer(buyer);
        payment.setSeller(auction.getOwner());
        payment.setTotalAmount(total);
        payment.setCommissionAmount(commission);
        payment.setSellerAmount(sellerAmount);
        paymentRepository.save(payment);

        return buildPayFastUrl(payment, buyer, auction);
    }

    // Build the PayFast redirect URL with MD5 signature
    private String buildPayFastUrl(Payment payment, User buyer, AuctionItem auction) {

        LinkedHashMap<String, String> params = new LinkedHashMap<>();
        params.put("merchant_id", merchantId);
        params.put("merchant_key", merchantKey);
        params.put("return_url", returnUrl + "?auction_id=" + payment.getAuctionItem().getId().toString());
        params.put("cancel_url", cancelUrl);
        params.put("notify_url", notifyUrl);
        params.put("name_first", buyer.getFullName().split(" ")[0]);
        params.put("name_last", buyer.getFullName().contains(" ")
                ? buyer.getFullName().substring(buyer.getFullName().indexOf(" ") + 1)
                : "");
        params.put("email_address", buyer.getEmail());
        params.put("m_payment_id", payment.getId().toString());
        params.put("amount", String.format(java.util.Locale.US, "%.2f", payment.getTotalAmount()));
        params.put("item_name", auction.getTitle());
        params.put("item_description", "Auction win payment");


        String signature = generateSignature(params, passphrase);
        params.put("signature", signature);

        String baseUrl = sandbox
                ? "https://sandbox.payfast.co.za/eng/process"
                : "https://www.payfast.co.za/eng/process";

        StringBuilder url = new StringBuilder(baseUrl + "?");
        params.forEach((k, v) -> {
            try {
                url.append(URLEncoder.encode(k, "UTF-8"))
                        .append("=")
                        .append(URLEncoder.encode(v, "UTF-8"))
                        .append("&");
            } catch (UnsupportedEncodingException e) {
                throw new RuntimeException(e);
            }
        });
        System.out.println("PAYFAST URL: " + url);
        return url.substring(0, url.length() - 1);
    }

    // Generate MD5 signature for PayFast
    private String generateSignature(LinkedHashMap<String, String> params, String passphrase) {
        StringBuilder sb = new StringBuilder();
        params.forEach((k, v) -> {
            if (!k.equals("signature")) {
                try {
                    sb.append(k).append("=")
                            .append(URLEncoder.encode(v, "UTF-8"))
                            .append("&");
                } catch (UnsupportedEncodingException e) {
                    throw new RuntimeException(e);
                }
            }
        });

        String str = sb.substring(0, sb.length() - 1);
        if (passphrase != null && !passphrase.isEmpty()) {
            str += "&passphrase=" + passphrase;
        }

        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            byte[] hash = md.digest(str.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    // Handle PayFast ITN webhook — called by PayFast after payment
    public void handleItn(Map<String, String> itnData) {
        System.out.println("ITN RECEIVED: " + itnData);

        String mPaymentId = itnData.get("m_payment_id");
        String paymentStatus = itnData.get("payment_status");
        String pfPaymentId = itnData.get("pf_payment_id");

        System.out.println("m_payment_id: " + mPaymentId);
        System.out.println("payment_status: " + paymentStatus);

        if (mPaymentId == null || mPaymentId.isEmpty()) {
            System.out.println("ITN ERROR: m_payment_id is null or empty");
            return;
        }

        try {
            Payment payment = paymentRepository.findById(UUID.fromString(mPaymentId))
                    .orElseThrow(() -> new RuntimeException("Payment not found: " + mPaymentId));

            if ("COMPLETE".equals(paymentStatus)) {
                payment.setStatus(PaymentStatus.HELD);
                payment.setPayfastPaymentId(pfPaymentId);
                payment.setPaidAt(LocalDateTime.now());
                System.out.println("Payment HELD for: " + mPaymentId);
            } else {
                payment.setStatus(PaymentStatus.FAILED);
                System.out.println("Payment FAILED for: " + mPaymentId);
            }

            paymentRepository.save(payment);
        } catch (Exception e) {
            System.out.println("ITN EXCEPTION: " + e.getMessage());
        }
    }

    // Called by scheduleRelease — not exposed to admin anymore
    public Payment releasePayment(UUID auctionId) {
        Payment payment = paymentRepository.findByAuctionItemId(auctionId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (payment.getStatus() != PaymentStatus.HELD) {
            throw new RuntimeException("Payment is not in escrow.");
        }

        payment.setStatus(PaymentStatus.RELEASED);
        payment.setReleasedAt(LocalDateTime.now());
        return paymentRepository.save(payment);
    }


    // Buyer cancels only allowed before PICKED_UP
    public Payment cancelPayment(UUID auctionId, String buyerEmail) {
        Payment payment = paymentRepository.findByAuctionItemId(auctionId)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!payment.getBuyer().getEmail().equals(buyerEmail)) {
            throw new RuntimeException("You are not the buyer for this payment.");
        }

        if (payment.getStatus() != PaymentStatus.HELD) {
            throw new RuntimeException("Only held payments can be cancelled.");
        }

        // Check delivery status, cannot cancel after pickup
        deliveryRepository.findByAuctionItemId(auctionId).ifPresent(delivery -> {
            if (delivery.getStatus() == DeliveryStatus.PICKED_UP ||
                    delivery.getStatus() == DeliveryStatus.IN_TRANSIT ||
                    delivery.getStatus() == DeliveryStatus.DELIVERED) {
                throw new RuntimeException("Cannot cancel after item has been picked up.");
            }
        });

        payment.setStatus(PaymentStatus.REFUNDED);
        return paymentRepository.save(payment);
    }

    public List<Payment> getPaymentsForBuyer(String email) {
        User buyer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return paymentRepository.findByBuyerId(buyer.getId());
    }

    public List<Payment> getPaymentsForSeller(String email) {
        User seller = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return paymentRepository.findBySellerId(seller.getId());
    }

    public Payment getPaymentByAuctionId(UUID auctionId) {
        return paymentRepository.findByAuctionItemId(auctionId)
                .orElseThrow(() -> new RuntimeException("Payment not found for this auction"));
    }

    public List<Payment> getAllPayments() {
        return paymentRepository.findAll();
    }

    public PaymentResponse mapToResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getAuctionItem().getId(),
                payment.getAuctionItem().getTitle(),
                payment.getBuyer().getEmail(),
                payment.getSeller().getEmail(),
                payment.getTotalAmount(),
                payment.getCommissionAmount(),
                payment.getSellerAmount(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getPaidAt(),
                payment.getReleasedAt()
        );
    }
}