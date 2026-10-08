package com.mambesi.action.bid;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.auction.AuctionService;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import jakarta.persistence.OptimisticLockException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class BidService {

    private final BidRepository bidRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    private final AuctionService auctionService;

    private int extensionThresholdMinutes;

    private int extensionMinutes;


    @Autowired
    private SimpMessagingTemplate messagingTemplate;


    public BidService(BidRepository bidRepository,
                      AuctionRepository auctionRepository,
                      UserRepository userRepository, AuctionService auctionService) {
        this.bidRepository = bidRepository;
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
        this.auctionService = auctionService;
    }

    @Transactional
    public Bid placeBid(UUID auctionId, double amount, String userEmail) {

        AuctionItem auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (!auction.isActive()) {
            throw new RuntimeException("This auction has already closed.");
        }

        LocalDateTime now = LocalDateTime.now();

        if (now.isBefore(auction.getStartTime())) {
            throw new RuntimeException("This auction has not started yet.");
        }

        if (now.isAfter(auction.getEndTime())) {
            throw new RuntimeException("This auction has already ended.");
        }

        User bidder = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Seller cannot bid on their own listing
        if (auction.getOwner().getId().equals(bidder.getId())) {
            throw new RuntimeException("You cannot bid on your own listing.");
        }

        // Current highest bidder cannot re-bid while they are still winning
        List<Bid> existingBids = bidRepository.findByAuctionItemId(auctionId);
        boolean isBidder = existingBids.stream()
                .max(Comparator.comparingDouble(Bid::getAmount))
                .map(b -> b.getBidder().getId().equals(bidder.getId()))
                .orElse(false);
        if (isBidder) {
            throw new RuntimeException("You are already the highest bidder. You can only bid again once someone outbids you.");
        }

        // Minimum bid increment — R5 floor
        double minimumBid;
        if (existingBids.isEmpty()) {
            minimumBid = auction.getStartingPrice();
        } else {
            minimumBid = auction.getCurrentPrice() + Math.max(5.0, auction.getBidIncrement());
        }

        if (amount < minimumBid) {
            throw new RuntimeException(
                    existingBids.isEmpty()
                            ? String.format("Minimum bid is R%.2f (starting price).", minimumBid)
                            : String.format("Minimum bid is R%.2f (current price + R%.2f increment).",
                            minimumBid, Math.max(5.0, auction.getBidIncrement()))
            );
        }

        // Update current price
        auction.setCurrentPrice(amount);

        // Rolling 3-minute close extension
        // If bid lands within the threshold window before closing, reset end time
        // to now + extensionDurationMinutes (not add on top of current end time)
        int threshold = auction.getExtensionThresholdMinutes();
        int duration  = auction.getExtensionDurationMinutes();
        LocalDateTime extensionCutoff = auction.getEndTime().minusMinutes(threshold);

        if (now.isAfter(extensionCutoff)) {
            LocalDateTime newEndTime = now.plusMinutes(duration);
            auction.setEndTime(newEndTime);
            System.out.println("Auction extended (rolling reset) to: " + newEndTime);
        }

        auctionRepository.save(auction);

        Bid bid = new Bid();
        bid.setAuctionItem(auction);
        bid.setBidder(bidder);
        bid.setAmount(amount);
        bid.setTimestamp(now);
        Bid saved = bidRepository.save(bid);

        // Broadcast via WebSocket
        BidMessage message = new BidMessage();
        message.setAuctionId(auctionId.toString());
        message.setBidderEmail(userEmail);
        message.setAmount(amount);
        message.setTimestamp(now.toString());
        message.setNewEndTime(auction.getEndTime().toString());
        messagingTemplate.convertAndSend("/topic/bids", message);

        return saved;
    }

    public List<Bid> getBidsForAuction(UUID auctionId) {
        return bidRepository.findByAuctionItemId(auctionId);
    }
}