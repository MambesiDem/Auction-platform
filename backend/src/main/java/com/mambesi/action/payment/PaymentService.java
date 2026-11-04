package com.mambesi.action.payment;
import com.mambesi.action.auction.*;
import com.mambesi.action.order.*;
import com.mambesi.action.delivery.*;
import com.mambesi.action.common.*;
import com.mambesi.action.notification.EmailService;
import com.mambesi.action.payment.dto.PaymentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class PaymentService {
    @org.springframework.beans.factory.annotation.Autowired private com.mambesi.action.user.UserRepository users;
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final PaymentRepository payments;private final AuctionRepository auctions;private final OrderService orders;
    private final DeliveryRepository deliveries;private final PaymentEventRepository events;private final PayfastClient provider;private final EmailService email;
    public PaymentService(PaymentRepository p,AuctionRepository a,OrderService o,DeliveryRepository d,PaymentEventRepository e,PayfastClient f,EmailService m){payments=p;auctions=a;orders=o;deliveries=d;events=e;provider=f;email=m;}
    @Transactional public String initiatePayment(UUID auctionId,String buyer){
        provider.requireCheckoutAllowed();AuctionItem a=lock(auctionId);Order o=orders.getByAuctionId(auctionId);
        if(a.isActive() || !o.getBuyer().getEmail().equals(buyer) || a.getWinner()==null || !a.getWinner().getId().equals(o.getBuyer().getId()))throw new SecurityException("Only the current committed buyer can pay.");
        if(o.getStatus()!=OrderStatus.AWAITING_PAYMENT || o.getPaymentDeadline()==null || !AppTime.now().isBefore(o.getPaymentDeadline()))throw new IllegalArgumentException("Payment is not available for this order. If you already attempted payment, contact support.");
        Optional<Payment> latest=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId());
        if(latest.isPresent() && latest.get().getStatus()==PaymentStatus.PENDING)return provider.checkout(latest.get()); // Resume the same attempt.
        if(latest.isPresent() && latest.get().getStatus()!=PaymentStatus.FAILED)throw new IllegalArgumentException("This order already has a confirmed or unresolved payment.");
        Payment p=new Payment();p.setAuctionItem(a);p.setOrder(o);p.setBuyer(o.getBuyer());p.setSeller(a.getOwner());p.setTotalAmount(o.getAgreedPrice());
        var fee=Money.fee(o.getAgreedPrice(),o.getCommissionRate());p.setCommissionAmount(fee.doubleValue());p.setSellerAmount(Money.value(o.getAgreedPrice()).subtract(fee).doubleValue());p.setStatus(PaymentStatus.PENDING);payments.saveAndFlush(p);
        events.save(new PaymentEvent(p,null,PaymentStatus.PENDING,buyer,"Hosted checkout attempt created"));return provider.checkout(p);
    }
    // Validation occurs before the financial transaction to avoid holding item locks during network calls.
    public ValidatedNotification validateNotification(String raw,String remote,String forwarded){
        var data=provider.parse(raw);UUID id;
        try{id=UUID.fromString(data.get("m_payment_id"));}catch(Exception e){throw new IllegalArgumentException("Invalid payment reference.");}
        Payment p=payments.findById(id).orElseThrow(()->new IllegalArgumentException("Payment attempt not found."));
        provider.validate(data,remote,forwarded,p.getTotalAmount());String status=data.get("payment_status"),ref=data.get("pf_payment_id");
        if(ref==null || ref.isBlank())throw new IllegalArgumentException("Provider transaction reference is required.");
        if(!Set.of("COMPLETE","FAILED","CANCELLED").contains(status))throw new IllegalArgumentException("Unsupported payment notification status.");
        return new ValidatedNotification(id,ref,status);
    }
    public record ValidatedNotification(UUID paymentId,String providerId,String status){}
    @Transactional public void applyNotification(ValidatedNotification n){
        Payment before=payments.findById(n.paymentId()).orElseThrow();lock(before.getAuctionItem().getId());entityManager.refresh(before);Payment p=before;
        Optional<Payment> other=payments.findByPayfastPaymentId(n.providerId());
        if(other.isPresent() && !other.get().getId().equals(p.getId())) {
            if(other.get().getOriginalAttempt()!=null && other.get().getOriginalAttempt().getId().equals(p.getId()))return;
            throw new SecurityException("Provider transaction is already linked to another attempt.");
        }
        if(p.getPayfastPaymentId()!=null && !p.getPayfastPaymentId().equals(n.providerId())) {
            if(!"COMPLETE".equals(n.status()))return;
            // A resumed hosted checkout can yield another genuine charge. Preserve the original
            // transaction and record the additional receipt for refund review, never a second sale.
            Payment extra=new Payment();extra.setOriginalAttempt(p);extra.setAuctionItem(p.getAuctionItem());extra.setBuyer(p.getBuyer());extra.setSeller(p.getSeller());
            extra.setTotalAmount(p.getTotalAmount());extra.setCommissionAmount(0);extra.setSellerAmount(0);extra.setPaidAt(AppTime.now());extra.setPayfastPaymentId(n.providerId());extra.setStatus(PaymentStatus.REVIEW_REQUIRED);payments.save(extra);
            events.save(new PaymentEvent(extra,null,PaymentStatus.REVIEW_REQUIRED,"provider","Additional verified charge on resumed checkout; refund review required"));return;
        }
        if(!"COMPLETE".equals(n.status())){
            if(p.getStatus()==PaymentStatus.PENDING){p.setPayfastPaymentId(n.providerId());change(p,PaymentStatus.FAILED,"provider","Verified failed or cancelled payment notification");}return;
        }
        if(p.getStatus()!=PaymentStatus.PENDING && p.getStatus()!=PaymentStatus.FAILED)return; // Duplicate success cannot reverse refund/payout state.
        p.setPayfastPaymentId(n.providerId());p.setPaidAt(AppTime.now());Order o=p.getOrder();
        if(o==null || o.getStatus()!=OrderStatus.AWAITING_PAYMENT){change(p,PaymentStatus.REVIEW_REQUIRED,"provider","Payment received for an order that is no longer awaiting payment; review/refund required");return;}
        change(p,PaymentStatus.HELD,"provider","Buyer payment verified; no escrow or payout is implied");
        orders.transitionStatus(o.getId(),OrderStatus.PREPARATION,"provider","Verified buyer payment");
        AfterCommit.run(()->{email.sendPaymentConfirmedEmail(p.getBuyer().getEmail(),p.getAuctionItem().getTitle(),p.getTotalAmount());email.sendSellerPaymentReceivedEmail(p.getSeller().getEmail(),p.getAuctionItem().getTitle(),p.getSellerAmount());});
    }
    @Transactional public Payment cancelPayment(UUID auctionId,String buyer){
        lock(auctionId);Order o=orders.getByAuctionId(auctionId);
        if(!o.getBuyer().getEmail().equals(buyer))throw new SecurityException("This order belongs to another buyer.");
        Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow(()->new IllegalArgumentException("No payment found."));
        if(p.getStatus()==PaymentStatus.REFUND_REQUESTED || p.getStatus()==PaymentStatus.REFUNDED)return p;
        if(p.getStatus()!=PaymentStatus.HELD || !Set.of(OrderStatus.PREPARATION,OrderStatus.COLLECTION_PENDING).contains(o.getStatus()))throw new IllegalArgumentException("Use the problem-reporting process after pickup.");
        Optional<Delivery> job=deliveries.findByAuctionItemId(auctionId);
        if(job.isPresent()){
            Delivery d=job.get();if(!Set.of(DeliveryStatus.PENDING,DeliveryStatus.ACCEPTED).contains(d.getStatus()))throw new IllegalArgumentException("The item has already been collected.");
            d.setStatus(DeliveryStatus.CANCELLED);deliveries.save(d);
        }
        orders.transitionStatus(o.getId(),OrderStatus.CANCELLED,buyer,"Buyer requested cancellation before pickup");p.setReleaseDueAt(null);change(p,PaymentStatus.REFUND_REQUESTED,buyer,"Cancellation approved; provider refund still required");return p;
    }
    @Transactional public void scheduleRelease(UUID auctionId){
        lock(auctionId);Order o=orders.getByAuctionId(auctionId);Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow();
        Delivery d=deliveries.findByAuctionItemId(auctionId).orElseThrow();
        if(d.getStatus()!=DeliveryStatus.DELIVERED || !d.isDeliveryConfirmed() || o.getStatus()!=OrderStatus.DELIVERED || p.getStatus()!=PaymentStatus.HELD)throw new IllegalArgumentException("Confirmed handover is required before settlement eligibility.");
        // Five minutes is a sandbox operational review window, not a limit on later valid claims.
        if(p.getReleaseDueAt()==null){p.setReleaseDueAt(AppTime.now().plusMinutes(5));payments.save(p);}
    }
    @Transactional public Payment releasePayment(UUID auctionId){
        lock(auctionId);Order o=orders.getByAuctionId(auctionId);Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow();
        if(p.getStatus()!=PaymentStatus.HELD || p.getReleaseDueAt()==null || AppTime.now().isBefore(p.getReleaseDueAt()) || o.getStatus()!=OrderStatus.DELIVERED)return p;
        Delivery d=deliveries.findByAuctionItemId(auctionId).orElseThrow();
        if(d.getStatus()!=DeliveryStatus.DELIVERED || !d.isDeliveryConfirmed())return p;
        change(p,PaymentStatus.RELEASE_REQUESTED,"system","Settlement eligible after documented delivery; provider payout not yet confirmed");return p;
    }
    @Transactional public Payment recordSettlement(UUID id,boolean refund,String reference,String admin){
        Payment initial=payments.findById(id).orElseThrow(()->new IllegalArgumentException("Payment not found."));lock(initial.getAuctionItem().getId());entityManager.refresh(initial);Payment p=initial;
        if(reference==null || reference.isBlank() || reference.length()>300)throw new IllegalArgumentException("A provider/bank reconciliation reference is required.");
        if(provider.isSandbox() && !reference.startsWith("SANDBOX-"))throw new IllegalArgumentException("Sandbox confirmations must use a SANDBOX- reference; they do not transfer money.");
        if(!provider.isSandbox() && reference.startsWith("SANDBOX-"))throw new IllegalArgumentException("A sandbox reference cannot confirm a live transfer.");
        Order o=p.getOrder();if(o==null && !refund)throw new IllegalArgumentException("An order is required for seller payout.");
        if(refund){
            if(p.getStatus()!=PaymentStatus.REFUND_REQUESTED)throw new IllegalArgumentException("Refund must first be approved and requested.");
            p.setRefundReference(reference);change(p,PaymentStatus.REFUNDED,admin,"External provider refund reconciled: "+reference);
        }else{
            if(p.getStatus()!=PaymentStatus.RELEASE_REQUESTED || o==null || o.getStatus()!=OrderStatus.DELIVERED)throw new IllegalArgumentException("Settlement is paused or not eligible.");
            p.setSettlementReference(reference);p.setReleasedAt(AppTime.now());change(p,PaymentStatus.RELEASED,admin,"External seller payout reconciled: "+reference);orders.transitionStatus(o.getId(),OrderStatus.COMPLETED,admin,"Seller payout reconciled");
        }
        return p;
    }
    @Transactional public Payment reconcileAttempt(UUID id,String action,String reference,String reason,String admin){
        Payment p=payments.findById(id).orElseThrow(()->new IllegalArgumentException("Payment not found."));lock(p.getAuctionItem().getId());entityManager.refresh(p);
        if(reference==null || reference.isBlank() || reference.length()>300 || reason==null || reason.isBlank() || reason.length()>2000)throw new IllegalArgumentException("Record the external provider reconciliation reference and investigation result.");
        if("FAILED".equals(action) && p.getStatus()==PaymentStatus.PENDING){
            change(p,PaymentStatus.FAILED,admin,"Provider reconciliation confirms this attempt cannot complete: "+reference+". "+reason);
        }else if("REFUND_REQUESTED".equals(action) && p.getStatus()==PaymentStatus.REVIEW_REQUIRED){
            change(p,PaymentStatus.REFUND_REQUESTED,admin,"Refund approved after reconciliation: "+reference+". "+reason);
        }else throw new IllegalArgumentException("Only an unresolved pending attempt can be confirmed failed, or a reviewed payment approved for refund.");
        return p;
    }
    public void change(Payment p,PaymentStatus status,String actor,String reason){PaymentStatus from=p.getStatus();if(from==status)return;p.setStatus(status);payments.save(p);events.save(new PaymentEvent(p,from,status,actor,reason));}
    public List<Payment> getPaymentsForBuyer(String email){return payments.findByBuyerId(users.findByEmail(email).orElseThrow().getId());}
    public List<Payment> getPaymentsForSeller(String email){return payments.findBySellerId(users.findByEmail(email).orElseThrow().getId());}
    public Payment getPaymentByAuctionId(UUID id,String buyer){Order o=orders.getByAuctionId(id);if(!o.getBuyer().getEmail().equals(buyer))throw new SecurityException("This payment belongs to another buyer.");return payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow(()->new IllegalArgumentException("Payment not found."));}
    public List<Payment> getAllPayments(){return payments.findAll();}
    public PaymentResponse mapToResponse(Payment p){PaymentResponse r=new PaymentResponse(p.getId(),p.getAuctionItem().getId(),p.getAuctionItem().getTitle(),p.getBuyer().getEmail(),p.getSeller().getEmail(),p.getTotalAmount(),p.getCommissionAmount(),p.getSellerAmount(),p.getStatus(),p.getCreatedAt(),p.getPaidAt(),p.getReleasedAt());r.setOrderId(p.getOrder()==null?null:p.getOrder().getId());r.setCreatedAt(p.getCreatedAt());r.setRefundReference(p.getRefundReference());r.setSettlementReference(p.getSettlementReference());return r;}
    private AuctionItem lock(UUID id){return auctions.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Auction not found."));}
}
