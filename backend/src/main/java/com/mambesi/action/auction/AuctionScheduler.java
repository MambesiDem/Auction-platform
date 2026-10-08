package com.mambesi.action.auction;
import com.mambesi.action.order.*;
import com.mambesi.action.common.AppTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.data.domain.PageRequest;
import java.util.*;
@Component
public class AuctionScheduler {
    private final AuctionRepository auctions;private final AuctionService service;private final OrderRepository orders;private final RunnerUpOfferRepository offers;
    public AuctionScheduler(AuctionRepository a,AuctionService s,OrderRepository o,RunnerUpOfferRepository r){auctions=a;service=s;orders=o;offers=r;}
    @Scheduled(fixedDelay=5000)
    public void checkAuctions(){
        for(UUID id:auctions.findDueToCloseIds(AppTime.now(),PageRequest.of(0,100))) attempt(id,()->service.closeExpiredAuction(id));
        Set<UUID> expired=new LinkedHashSet<>(orders.findExpiredAuctionIds(OrderStatus.AWAITING_PAYMENT,AppTime.now()));
        expired.addAll(offers.findExpiredAuctionIds(RunnerUpOffer.Status.OFFERED,AppTime.now()));
        // Declined offers also need their next candidate; include auctions with cancelled latest commitments.
        expired.addAll(auctions.findOffersToAdvance(AppTime.now(),PageRequest.of(0,100)));
        for(UUID id:expired) attempt(id,()->service.expirePaymentAndReassign(id));
    }
    private void attempt(UUID id,Runnable action){try{action.run();}catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).error("Auction job failed for {}",id,e);}}
}
