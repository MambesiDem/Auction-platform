package com.mambesi.action.bid;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.auction.AuctionService;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import jakarta.persistence.OptimisticLockException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class BidService {

    private final BidRepository bidRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    private final AuctionService auctionService;


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

    public Bid placeBid(UUID auctionId, String userEmail, double amount) {

        try {

            AuctionItem auction = auctionRepository.findById(auctionId)
                    .orElseThrow(() -> new RuntimeException("Auction not found"));

            if (LocalDateTime.now().isBefore(auction.getStartTime())) {
                throw new RuntimeException("Auction has not started yet");
            }

            if (LocalDateTime.now().isAfter(auction.getEndTime())) {
                auctionService.closeAuction(auction);
                throw new RuntimeException("Auction has already ended");
            }

            if (!auction.isActive()) {
                throw new RuntimeException("Auction is closed");
            }

            if (amount <= auction.getCurrentPrice()) {
                throw new RuntimeException("Bid must be higher than current price");
            }

            User bidder = userRepository.findByEmail(userEmail)
                    .orElseThrow(() -> new RuntimeException("User not found"));

            Bid bid = new Bid();
            bid.setAuctionItem(auction);
            bid.setBidder(bidder);
            bid.setAmount(amount);

            // update auction price (protected by @Version)
            auction.setCurrentPrice(amount);
            auctionRepository.save(auction);

            Bid savedBid = bidRepository.save(bid);

            BidMessage message = new BidMessage();
            message.setAuctionId(auctionId.toString());
            message.setBidderEmail(userEmail);
            message.setAmount(amount);
            message.setTimestamp(savedBid.getTimestamp().toString());

            messagingTemplate.convertAndSend("/topic/bids", message);

            return savedBid;

        } catch (OptimisticLockException e) {
            throw new RuntimeException("Someone placed a higher bid. Try again.");
        }
    }

    public List<Bid> getBidsForAuction(UUID auctionId) {
        return bidRepository.findByAuctionItemId(auctionId);
    }
}