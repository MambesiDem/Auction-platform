package com.mambesi.action.delivery;
import com.mambesi.action.auction.*;
import com.mambesi.action.order.*;
import com.mambesi.action.payment.*;
import com.mambesi.action.user.*;
import com.mambesi.action.common.*;
import com.mambesi.action.notification.EmailService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class DeliveryService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final DeliveryRepository deliveries;private final AuctionRepository auctions;private final UserRepository users;
    private final PaymentRepository payments;private final OrderService orders;private final PaymentService settlement;private final EmailService email;
    private final java.security.SecureRandom random=new java.security.SecureRandom();
    public DeliveryService(DeliveryRepository d,AuctionRepository a,UserRepository u,PaymentRepository p,OrderService o,PaymentService s,EmailService e){deliveries=d;auctions=a;users=u;payments=p;orders=o;settlement=s;email=e;}
    @Transactional public Delivery createDelivery(UUID id,String seller,String evidence){
        AuctionItem a=lock(id);if(!a.getOwner().getEmail().equals(seller))throw new SecurityException("Only the seller can book collection.");
        Order o=orders.getByAuctionId(id);Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow(()->new IllegalArgumentException("Buyer payment is required before collection."));
        if(a.isActive() || p.getStatus()!=PaymentStatus.HELD || !Set.of(OrderStatus.PREPARATION,OrderStatus.COLLECTION_PENDING).contains(o.getStatus()))throw new IllegalArgumentException("This order is not ready for collection.");
        checkEvidence(evidence);Optional<Delivery> existing=deliveries.findByAuctionItemId(id);if(existing.isPresent())return existing.get();
        Delivery d=new Delivery();d.setAuctionItem(a);d.setBuyer(o.getBuyer());d.setSeller(a.getOwner());d.setPreparationEvidence(evidence);d.setPickupCode(code());d.setDeliveryCode(code());d.setStatus(DeliveryStatus.PENDING);deliveries.save(d);
        orders.transitionStatus(o.getId(),OrderStatus.COLLECTION_PENDING,seller,"Seller confirmed listed item and preparation evidence; collection offered");return d;
    }
    @Transactional public Delivery acceptDelivery(UUID id,String driver){
        Delivery d=lockedDelivery(id);if(d.getStatus()!=DeliveryStatus.PENDING)throw new IllegalArgumentException("This job has already been accepted or cancelled.");
        requirePaid(d);User u=users.findByEmail(driver).orElseThrow();if(u.getRole()!=Role.DRIVER || u.isBanned())throw new SecurityException("An active driver account is required.");
        d.setDriver(u);d.setStatus(DeliveryStatus.ACCEPTED);deliveries.save(d);
        AfterCommit.run(()->email.sendDeliveryStatusEmail(d.getBuyer().getEmail(),d.getAuctionItem().getTitle(),"ACCEPTED"));return d;
    }
    public static class InvalidCodeException extends IllegalArgumentException{public InvalidCodeException(String text){super(text);}}
    @Transactional(noRollbackFor=InvalidCodeException.class)
    public Delivery updateStatus(UUID id,String driver,DeliveryStatus next,String suppliedCode,String evidence){
        Delivery d=lockedDelivery(id);
        if(d.getDriver()==null || !d.getDriver().getEmail().equals(driver))throw new SecurityException("Only the assigned driver can update this job.");
        requirePaid(d);
        if(d.getStatus()==next)return d;
        boolean allowed=switch(d.getStatus()){
            case ACCEPTED -> next==DeliveryStatus.PICKED_UP;
            case PICKED_UP -> next==DeliveryStatus.IN_TRANSIT;
            case IN_TRANSIT -> next==DeliveryStatus.DELIVERED;
            default -> false;
        };
        if(!allowed)throw new IllegalArgumentException("Complete each delivery stage in order. Cancelled or completed jobs cannot move backwards.");
        checkEvidence(evidence);
        if(next==DeliveryStatus.PICKED_UP){validateCode(d,true,suppliedCode);d.setPickupEvidence(evidence);}
        if(next==DeliveryStatus.DELIVERED){validateCode(d,false,suppliedCode);d.setDeliveryEvidence(evidence);d.setDeliveryConfirmed(true);}
        d.setStatus(next);deliveries.save(d);Order o=orders.getByAuctionId(d.getAuctionItem().getId());
        if(next==DeliveryStatus.PICKED_UP)orders.transitionStatus(o.getId(),OrderStatus.IN_TRANSIT,driver,"Pickup confirmed with seller handover code and evidence");
        if(next==DeliveryStatus.DELIVERED)orders.transitionStatus(o.getId(),OrderStatus.DELIVERED,driver,"Buyer handover code verified; delivery evidence recorded");
        if(next==DeliveryStatus.DELIVERED)settlement.scheduleRelease(d.getAuctionItem().getId());
        AfterCommit.run(()->email.sendDeliveryStatusEmail(d.getBuyer().getEmail(),d.getAuctionItem().getTitle(),next.name()));return d;
    }
    private void validateCode(Delivery d,boolean pickup,String value){
        int attempts=pickup?d.getPickupCodeAttempts():d.getDeliveryCodeAttempts();
        if(attempts>=5)throw new InvalidCodeException("Handover code is locked. Contact support; do not hand over the item.");
        String expected=pickup?d.getPickupCode():d.getDeliveryCode();
        if(expected==null || value==null || !java.security.MessageDigest.isEqual(expected.getBytes(java.nio.charset.StandardCharsets.UTF_8),value.trim().getBytes(java.nio.charset.StandardCharsets.UTF_8))){
            if(pickup)d.setPickupCodeAttempts(attempts+1);else d.setDeliveryCodeAttempts(attempts+1);deliveries.save(d);
            throw new InvalidCodeException("Incorrect handover code. "+(4-attempts)+" attempt(s) remain before support review.");
        }
    }
    @Transactional public Delivery resetCode(UUID id,boolean pickup,String admin,String reason){
        if(reason==null || reason.isBlank())throw new IllegalArgumentException("Support reason is required.");Delivery d=lockedDelivery(id);
        if(d.getStatus()==DeliveryStatus.CANCELLED || d.getStatus()==DeliveryStatus.DELIVERED)throw new IllegalArgumentException("This job is closed.");
        if(pickup){if(d.getStatus()!=DeliveryStatus.ACCEPTED)throw new IllegalArgumentException("Pickup reset requires an accepted job.");d.setPickupCode(code());d.setPickupCodeAttempts(0);}else{if(d.getStatus()!=DeliveryStatus.IN_TRANSIT)throw new IllegalArgumentException("Delivery reset requires an in-transit job.");d.setDeliveryCode(code());d.setDeliveryCodeAttempts(0);}
        deliveries.save(d);Order o=orders.getByAuctionId(d.getAuctionItem().getId());
        // Record resets separately even though the order state itself did not change.
        audit.save(new OrderEvent(o,o.getStatus(),o.getStatus(),admin,"Handover code reset: "+reason));return d;
    }
    @org.springframework.beans.factory.annotation.Autowired private OrderEventRepository audit;
    public List<Delivery> getPendingDeliveries(){return deliveries.findByStatus(DeliveryStatus.PENDING);}
    public List<Delivery> getMyDeliveries(String email){return deliveries.findByDriverId(user(email).getId());}
    public List<Delivery> getMyPurchases(String email){return deliveries.findByBuyerId(user(email).getId());}
    public List<Delivery> getMySales(String email){return deliveries.findBySellerId(user(email).getId());}
    public List<Delivery> getAllDeliveries(){return deliveries.findAll();}
    private User user(String email){return users.findByEmail(email).orElseThrow();}
    private AuctionItem lock(UUID id){return auctions.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Auction not found."));}
    private Delivery lockedDelivery(UUID id){Delivery initial=deliveries.findById(id).orElseThrow(()->new IllegalArgumentException("Delivery not found."));lock(initial.getAuctionItem().getId());entityManager.refresh(initial);return initial;}
    private void requirePaid(Delivery d){Order o=orders.getByAuctionId(d.getAuctionItem().getId());Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow();if(p.getStatus()!=PaymentStatus.HELD || Set.of(OrderStatus.CANCELLED,OrderStatus.DISPUTED,OrderStatus.RETURNING).contains(o.getStatus()))throw new IllegalArgumentException("This delivery is paused or cancelled. Contact support.");}
    private String code(){return String.format(java.util.Locale.ROOT,"%06d",random.nextInt(1000000));}
    private void checkEvidence(String text){if(text==null || text.isBlank() || text.length()>2000)throw new IllegalArgumentException("Record condition/packaging evidence or a photo reference (up to 2000 characters).");}
}
