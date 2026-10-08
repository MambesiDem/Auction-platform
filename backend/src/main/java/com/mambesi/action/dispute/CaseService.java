package com.mambesi.action.dispute;

import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.delivery.DeliveryRepository;
import com.mambesi.action.delivery.DeliveryStatus;
import com.mambesi.action.order.Order;
import com.mambesi.action.order.OrderRepository;
import com.mambesi.action.order.OrderService;
import com.mambesi.action.order.OrderStatus;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentService;
import com.mambesi.action.payment.PaymentStatus;
import com.mambesi.action.user.Role;
import com.mambesi.action.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
@Service
public class CaseService {
    private final OrderCaseRepository cases;private final CaseEventRepository events;private final OrderRepository orders;
    private final OrderService workflow;private final AuctionRepository auctions;private final PaymentRepository payments;private final PaymentService money;private final DeliveryRepository deliveries;
    public CaseService(OrderCaseRepository c,CaseEventRepository e,OrderRepository o,OrderService w,AuctionRepository a,PaymentRepository p,PaymentService m,DeliveryRepository d){cases=c;events=e;orders=o;workflow=w;auctions=a;payments=p;money=m;deliveries=d;}
    @Transactional public OrderCase open(UUID orderId,User buyer,String reason,String evidence){
        Order o=lockedOrder(orderId);if(!o.getBuyer().getId().equals(buyer.getId()))throw new SecurityException("Only this order's buyer can report a problem.");
        text(reason,2000);text(evidence,4000);
        if(cases.findByOrderId(orderId).isPresent())throw new IllegalArgumentException("A case already exists. Reply to it or appeal its decision.");
        Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(orderId).orElseThrow();
        if(!Set.of(PaymentStatus.HELD,PaymentStatus.RELEASE_REQUESTED,PaymentStatus.RELEASED).contains(p.getStatus()) || o.getStatus()==OrderStatus.CANCELLED)throw new IllegalArgumentException("This order is not eligible for this reporting route. Contact support about unresolved payment or refund issues.");
        OrderCase c=new OrderCase();c.setOrder(o);c.setStatus(OrderCase.Status.OPEN);c.setReason(reason);c.setBuyerEvidence(evidence);c.setPreviousOrderStatus(o.getStatus());c.setPreviousPaymentStatus(p.getStatus());cases.save(c);
        workflow.transitionStatus(o.getId(),OrderStatus.DISPUTED,buyer.getEmail(),"Buyer problem report: "+reason);p.setReleaseDueAt(null);
        if(p.getStatus()==PaymentStatus.RELEASE_REQUESTED)money.change(p,PaymentStatus.HELD,buyer.getEmail(),"Unconfirmed settlement paused for dispute");else payments.save(p);
        record(c,buyer,"Case opened. "+reason);return c;
    }
    @Transactional public OrderCase respond(UUID id,User user,String evidence){OrderCase c=lockedCase(id);requireParticipant(c,user);text(evidence,4000);if(c.getStatus()==OrderCase.Status.REFUND_APPROVED)throw new IllegalArgumentException("Refund is already approved; contact support for any further issue.");if(user.getId().equals(c.getOrder().getBuyer().getId()))c.setBuyerEvidence(evidence);else c.setSellerEvidence(evidence);cases.save(c);record(c,user,"Evidence submitted: "+evidence);return c;}
    @Transactional public OrderCase decide(UUID id,User admin,String outcome,String reason,String instructions,String costs){
        requireAdmin(admin);OrderCase c=lockedCase(id);text(reason,4000);
        if(!Set.of(OrderCase.Status.OPEN,OrderCase.Status.APPEALED,OrderCase.Status.RETURN_RECEIVED).contains(c.getStatus()))throw new IllegalArgumentException("Review an open case or inspected return before deciding.");
        Order o=c.getOrder();Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow();
        switch(outcome){
            case "RETURN_REQUIRED" -> {text(instructions,4000);text(costs,2000);c.setStatus(OrderCase.Status.RETURN_AUTHORISED);c.setReturnInstructions(instructions);c.setReturnCostAllocation(costs);workflow.transitionStatus(o.getId(),OrderStatus.RETURNING,admin.getEmail(),"Return authorised: "+reason);}
            case "REFUND" -> {
                c.setStatus(OrderCase.Status.REFUND_APPROVED);workflow.transitionStatus(o.getId(),OrderStatus.CANCELLED,admin.getEmail(),"Refund approved after case review: "+reason);
                deliveries.findByAuctionItemId(o.getAuctionItem().getId()).ifPresent(d->{if(Set.of(DeliveryStatus.PENDING,DeliveryStatus.ACCEPTED).contains(d.getStatus())){d.setStatus(DeliveryStatus.CANCELLED);deliveries.save(d);}});
                p.setReleaseDueAt(null);money.change(p,PaymentStatus.REFUND_REQUESTED,admin.getEmail(),"Refund approved; provider execution and reconciliation still required");
            }
            case "REJECT" -> {
                if(c.getStatus()==OrderCase.Status.RETURN_RECEIVED)throw new IllegalArgumentException("A received return requires an explicit refund or a documented support resolution; do not silently restore delivery.");
                c.setStatus(OrderCase.Status.REJECTED);workflow.transitionStatus(o.getId(),c.getPreviousOrderStatus(),admin.getEmail(),"Claim rejected: "+reason);
                if(c.getPreviousPaymentStatus()==PaymentStatus.RELEASE_REQUESTED)money.change(p,PaymentStatus.RELEASE_REQUESTED,admin.getEmail(),"Settlement eligibility restored after review");
                else if(c.getPreviousPaymentStatus()==PaymentStatus.HELD && c.getPreviousOrderStatus()==OrderStatus.DELIVERED)money.scheduleRelease(o.getAuctionItem().getId());
            }
            default -> throw new IllegalArgumentException("Choose RETURN_REQUIRED, REFUND or REJECT.");
        }
        c.setDecision(reason);cases.save(c);record(c,admin,"Decision "+outcome+": "+reason);return c;
    }
    @Transactional public OrderCase returnSent(UUID id,User buyer,String tracking){OrderCase c=lockedCase(id);if(!c.getOrder().getBuyer().getId().equals(buyer.getId()))throw new SecurityException("Only the buyer can submit return tracking.");if(c.getStatus()!=OrderCase.Status.RETURN_AUTHORISED)throw new IllegalArgumentException("Wait for return authorisation.");text(tracking,500);c.setTracking(tracking);c.setStatus(OrderCase.Status.RETURN_IN_TRANSIT);cases.save(c);record(c,buyer,"Return dispatched: "+tracking);return c;}
    @Transactional public OrderCase returnReceived(UUID id,User user,String evidence){OrderCase c=lockedCase(id);if(user.getRole()!=Role.ADMIN && !c.getOrder().getAuctionItem().getOwner().getId().equals(user.getId()))throw new SecurityException("Only the seller or support can record return receipt.");if(c.getStatus()!=OrderCase.Status.RETURN_IN_TRANSIT)throw new IllegalArgumentException("Return is not in transit.");text(evidence,4000);c.setReceiptEvidence(evidence);c.setStatus(OrderCase.Status.RETURN_RECEIVED);cases.save(c);record(c,user,"Return received; inspection evidence: "+evidence);return c;}
    @Transactional public OrderCase appeal(UUID id,User buyer,String reason){OrderCase c=lockedCase(id);if(!c.getOrder().getBuyer().getId().equals(buyer.getId()))throw new SecurityException("Only the buyer can appeal here. Sellers can submit evidence and contact support.");if(c.getStatus()!=OrderCase.Status.REJECTED)throw new IllegalArgumentException("Only a rejected decision can be appealed.");text(reason,4000);c.setStatus(OrderCase.Status.APPEALED);workflow.transitionStatus(c.getOrder().getId(),OrderStatus.DISPUTED,buyer.getEmail(),"Decision appealed: "+reason);Payment p=payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(c.getOrder().getId()).orElseThrow();p.setReleaseDueAt(null);if(p.getStatus()==PaymentStatus.RELEASE_REQUESTED)money.change(p,PaymentStatus.HELD,buyer.getEmail(),"Settlement paused for appeal");else payments.save(p);cases.save(c);record(c,buyer,"Appeal: "+reason);return c;}
    public Optional<OrderCase> forOrder(UUID id,User user){Order o=orders.findById(id).orElseThrow();requireOrderParticipant(o,user);return cases.findByOrderId(id);}
    public List<OrderCase> all(User user){requireAdmin(user);return cases.findAll();}
    public List<CaseEvent> history(OrderCase c){return events.findByOrderCaseIdOrderByRecordedAtAsc(c.getId());}
    private Order lockedOrder(UUID id){Order o=orders.findById(id).orElseThrow(()->new IllegalArgumentException("Order not found."));auctions.findByIdForUpdate(o.getAuctionItem().getId()).orElseThrow();entityManager.refresh(o);return o;}
    private OrderCase lockedCase(UUID id){OrderCase c=cases.findById(id).orElseThrow(()->new IllegalArgumentException("Case not found."));lockedOrder(c.getOrder().getId());entityManager.refresh(c);return c;}
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    public void requireOrderParticipant(Order o,User user){if(user.getRole()!=Role.ADMIN && !o.getBuyer().getId().equals(user.getId()) && !o.getAuctionItem().getOwner().getId().equals(user.getId()))throw new SecurityException("This order belongs to other users.");}
    private void requireParticipant(OrderCase c,User user){requireOrderParticipant(c.getOrder(),user);}
    private void requireAdmin(User u){if(u.getRole()!=Role.ADMIN)throw new SecurityException("Support administrator access is required.");}
    private void text(String s,int max){if(s==null || s.isBlank() || s.length()>max)throw new IllegalArgumentException("Provide a non-empty explanation within "+max+" characters.");}
    private void record(OrderCase c,User u,String detail){events.save(new CaseEvent(c,u.getEmail(),detail.length()>4000?detail.substring(0,4000):detail));}
}
