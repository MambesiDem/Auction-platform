package com.mambesi.action.auction;

import com.mambesi.action.auction.dto.AuctionResponse;
import com.mambesi.action.bid.BidRepository;
import com.mambesi.action.common.*;
import com.mambesi.action.order.Order;
import com.mambesi.action.order.OrderRepository;
import com.mambesi.action.order.OrderStatus;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentStatus;
import com.mambesi.action.user.Role;
import com.mambesi.action.user.User;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Component
public class AuctionResponseMapper {
    @org.springframework.beans.factory.annotation.Autowired private AuctionRepository auctions;
    private final BidRepository bids;private final OrderRepository orders;private final PaymentRepository payments;
    public AuctionResponseMapper(BidRepository b, OrderRepository o, PaymentRepository p){bids=b;orders=o;payments=p;}
    @Transactional(readOnly=true)
    public List<AuctionResponse> map(List<AuctionItem> items,User viewer){
        if(items.isEmpty())return List.of();
        List<UUID> ids=items.stream().map(AuctionItem::getId).toList();
        if(items.stream().anyMatch(a->!org.hibernate.Hibernate.isInitialized(a.getOwner()) || a.getWinner()!=null && !org.hibernate.Hibernate.isInitialized(a.getWinner()))){
            var loaded=auctions.findByIdIn(ids).stream().collect(Collectors.toMap(AuctionItem::getId,Function.identity()));
            items=ids.stream().map(loaded::get).filter(Objects::nonNull).toList();
        }
        UUID userId=viewer==null?null:viewer.getId();
        var stats=bids.summarizeForAuctions(ids,userId).stream().collect(Collectors.toMap(BidRepository.AuctionBidSummary::getAuctionId,Function.identity()));
        Map<UUID,Order> latest=new HashMap<>();
        for(Order o:orders.findByAuctionItemIdIn(ids))latest.merge(o.getAuctionItem().getId(),o,(a,b)->compareOrders(a,b)>=0?a:b);
        Map<UUID,Payment> attempts=new HashMap<>();
        for(Payment p:payments.findByAuctionItemIdIn(ids))if(p.getOrder()!=null)attempts.merge(p.getOrder().getId(),p,(a,b)->comparePayments(a,b)>=0?a:b);
        List<AuctionResponse> result=new ArrayList<>();
        for(AuctionItem a:items){
            boolean owner=viewer!=null && a.getOwner().getId().equals(userId),admin=viewer!=null && viewer.getRole()==Role.ADMIN;
            String winner=a.getWinner()!=null && (owner||admin||a.getWinner().getId().equals(userId))?a.getWinner().getEmail():null;
            var stat=stats.get(a.getId());boolean has=stat!=null && stat.getBidCount()>0;
            boolean reserve=a.getReservePrice()==null || a.getReservePrice()<=0 || has && Money.value(a.getCurrentPrice()).compareTo(Money.value(a.getReservePrice()))>=0;
            AuctionResponse r=new AuctionResponse(a.getId(),a.getTitle(),a.getDescription(),a.getStartingPrice(),a.getCurrentPrice(),a.isActive(),a.getStartTime(),a.getEndTime(),owner||admin?a.getOwner().getEmail():null,winner,null,a.getImageUrl(),a.getBidIncrement(),a.getExtensionThresholdMinutes(),a.getExtensionDurationMinutes(),reserve);
            r.setHasWinner(a.getWinner()!=null);r.setCommissionRate(a.getCommissionRate());r.setHasBids(has);r.setBidCount(stat==null?0:stat.getBidCount());r.setMyHighestBid(stat==null||stat.getMyHighestBid()==null?null:stat.getMyHighestBid().doubleValue());
            r.setNextMinimumBid(has?Money.value(a.getCurrentPrice()).add(Money.value(Math.max(5,a.getBidIncrement()))).doubleValue():a.getStartingPrice());
            r.setPaymentEligibility(a.isActive()?"AWAITING_AUCTION_RESULT":"NOT_CURRENT_BUYER");Order o=latest.get(a.getId());
            if(o!=null && viewer!=null && (owner||admin||o.getBuyer().getId().equals(userId))){
                r.setOrderStatus(o.getStatus().name());r.setOrderId(o.getId());r.setPaymentDeadline(o.getPaymentDeadline());
                boolean buyer=o.getBuyer().getId().equals(userId);Payment p=attempts.get(o.getId());
                if(buyer){
                    if(o.getStatus()==OrderStatus.CANCELLED)r.setPaymentEligibility("ORDER_CANCELLED");
                    else if(o.getStatus()!=OrderStatus.AWAITING_PAYMENT)r.setPaymentEligibility("PAYMENT_CONFIRMED_OR_UNDER_REVIEW");
                    else if(o.getPaymentDeadline()==null || !AppTime.now().isBefore(o.getPaymentDeadline()))r.setPaymentEligibility(p!=null&&p.getStatus()==PaymentStatus.PENDING?"PAYMENT_PROCESSING":"DEADLINE_EXPIRED");
                    else if(p!=null && !List.of(PaymentStatus.PENDING,PaymentStatus.FAILED).contains(p.getStatus()))r.setPaymentEligibility("PAYMENT_CONFIRMED_OR_UNDER_REVIEW");
                    else {r.setCanPay(!a.isActive());r.setPaymentEligibility("PAYMENT_ALLOWED");}
                }
            }
            result.add(r);
        }
        return result;
    }
    private int compareOrders(Order a,Order b){int c=a.getCreatedAt().compareTo(b.getCreatedAt());return c!=0?c:a.getId().toString().compareTo(b.getId().toString());}
    private int comparePayments(Payment a,Payment b){int c=a.getCreatedAt().compareTo(b.getCreatedAt());return c!=0?c:a.getId().toString().compareTo(b.getId().toString());}
}
