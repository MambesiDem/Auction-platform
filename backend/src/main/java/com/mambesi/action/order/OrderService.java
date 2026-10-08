package com.mambesi.action.order;
import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import com.mambesi.action.common.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
@Service
public class OrderService {
    private final OrderRepository orders;
    private final OrderEventRepository events;
    public OrderService(OrderRepository orders,OrderEventRepository events){this.orders=orders;this.events=events;}
    @Transactional
    public Order createOrderForAuctionWin(AuctionItem auction, User buyer,int minutes) {
        Optional<Order> existing=orders.findByAuctionItemId(auction.getId());
        if(existing.isPresent() && existing.get().getStatus()!=OrderStatus.CANCELLED) {
            if(!existing.get().getBuyer().getId().equals(buyer.getId())) throw new IllegalStateException("An unresolved order already exists. Contact support.");
            return existing.get();
        }
        Order o=new Order();o.setAuctionItem(auction);o.setBuyer(buyer);o.setStatus(OrderStatus.AWAITING_PAYMENT);
        o.setAgreedPrice(auction.getCurrentPrice());
        if(auction.getCommissionRate()==null) throw new IllegalStateException("Auction fee policy must be reviewed before sale.");
        o.setCommissionRate(auction.getCommissionRate());o.setListingTitle(auction.getTitle());o.setListingDescription(auction.getDescription());
        o.setPaymentDeadline(AppTime.now().plusMinutes(minutes));o.setLastActorEmail("system");o.setLastReason("Buyer commitment created");
        orders.save(o);events.save(new OrderEvent(o,null,o.getStatus(),"system",o.getLastReason()));return o;
    }
    @Transactional
    public Order transitionStatus(UUID id,OrderStatus next,String actor,String reason){
        Order o=orders.findById(id).orElseThrow(()->new IllegalArgumentException("Order not found."));
        if(actor==null || actor.isBlank() || reason==null || reason.isBlank() || reason.length()>6000) throw new IllegalArgumentException("Actor and reason are required.");
        OrderStatus from=o.getStatus();
        if(from==next) return o; // Repeating the same already-applied event is harmless.
        boolean valid=switch(from){
            case AWAITING_PAYMENT -> next==OrderStatus.PREPARATION || next==OrderStatus.CANCELLED;
            case PREPARATION -> next==OrderStatus.COLLECTION_PENDING || next==OrderStatus.CANCELLED || next==OrderStatus.DISPUTED;
            case COLLECTION_PENDING -> next==OrderStatus.IN_TRANSIT || next==OrderStatus.CANCELLED || next==OrderStatus.DISPUTED;
            case IN_TRANSIT -> next==OrderStatus.DELIVERED || next==OrderStatus.RETURNING || next==OrderStatus.DISPUTED;
            case DELIVERED, COMPLETED -> next==OrderStatus.COMPLETED || next==OrderStatus.DISPUTED;
            case DISPUTED -> Set.of(OrderStatus.PREPARATION,OrderStatus.COLLECTION_PENDING,OrderStatus.IN_TRANSIT,OrderStatus.DELIVERED,OrderStatus.COMPLETED,OrderStatus.RETURNING,OrderStatus.CANCELLED).contains(next);
            case RETURNING -> next==OrderStatus.COMPLETED || next==OrderStatus.CANCELLED || next==OrderStatus.DISPUTED;
            default -> false;
        };
        if(!valid) throw new IllegalStateException("Invalid order transition: "+from+" to "+next);
        o.setStatus(next);o.setLastActorEmail(actor);o.setLastReason(reason);orders.save(o);events.save(new OrderEvent(o,from,next,actor,reason));return o;
    }
    public Optional<Order> findByAuctionId(UUID id){return orders.findByAuctionItemId(id);}
    public Order getByAuctionId(UUID id){return findByAuctionId(id).orElseThrow(()->new IllegalArgumentException("Order not found."));}
    public List<Order> getOrdersForBuyer(UUID id){return orders.findByBuyerId(id);}
    public List<Order> getOrdersForSeller(String email){return orders.findByAuctionItemOwnerEmail(email);}
}
