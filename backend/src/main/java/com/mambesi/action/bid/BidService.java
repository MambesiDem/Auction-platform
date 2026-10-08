package com.mambesi.action.bid;
import com.mambesi.action.auction.*;
import com.mambesi.action.user.*;
import com.mambesi.action.common.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.*;
@Service
public class BidService {
    private final BidRepository bids;private final AuctionRepository auctions;private final UserRepository users;private final SimpMessagingTemplate messages;
    public BidService(BidRepository bids,AuctionRepository auctions,UserRepository users,SimpMessagingTemplate messages){this.bids=bids;this.auctions=auctions;this.users=users;this.messages=messages;}
    @Transactional
    public Bid placeBid(UUID id,double amount,String email){
        // Shared auction lock serializes only bids/closure/commitments for this specific item.
        AuctionItem a=auctions.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Auction not found."));
        LocalDateTime now=AppTime.now();
        if(!a.isActive() || !now.isBefore(a.getEndTime())) throw new IllegalArgumentException("This auction has ended.");
        if(now.isBefore(a.getStartTime())) throw new IllegalArgumentException("This auction has not started.");
        User buyer=users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("User not found."));
        if(buyer.isBanned()) throw new IllegalArgumentException("Your account is suspended.");
        if(a.getOwner().getId().equals(buyer.getId())) throw new IllegalArgumentException("You cannot bid on your own listing.");
        Optional<Bid> top=bids.findFirstByAuctionItemIdOrderByAmountDescTimestampAsc(id);
        if(top.isPresent() && top.get().getBidder().getId().equals(buyer.getId())) throw new IllegalArgumentException("You are already leading. You can bid again after being outbid.");
        java.math.BigDecimal minimum=top.isEmpty()?Money.value(a.getStartingPrice()):Money.value(a.getCurrentPrice()).add(Money.value(Math.max(5,a.getBidIncrement())));
        if(Money.value(amount).compareTo(minimum)<0) throw new IllegalArgumentException("Minimum bid is R"+minimum.toPlainString()+".");
        a.setCurrentPrice(amount);
        boolean extended=!now.isBefore(a.getEndTime().minusMinutes(a.getExtensionThresholdMinutes()));
        if(extended) a.setEndTime(now.plusMinutes(a.getExtensionDurationMinutes()));
        auctions.save(a);Bid b=new Bid();b.setAuctionItem(a);b.setBidder(buyer);b.setAmount(amount);b.setTimestamp(now);bids.save(b);
        BidMessage m=new BidMessage();m.setAuctionId(id.toString());m.setAmount(amount);m.setTimestamp(now.toString());m.setNewEndTime(a.getEndTime().toString());m.setReserveMet(a.getReservePrice()==null || a.getReservePrice()<=0 || amount>=a.getReservePrice());
        // No bidder identity is broadcast. Only committed bids are announced.
        AfterCommit.run(()->messages.convertAndSend("/topic/bids",m));return b;
    }
    public List<Bid> getBidsForAuction(UUID id){return bids.findByAuctionItemId(id);}
}
