package com.mambesi.action.auction;

import com.mambesi.action.bid.Bid;
import com.mambesi.action.bid.BidMessage;
import com.mambesi.action.bid.BidRepository;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.Optional;
import java.util.stream.Collectors;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final BidRepository bidRepository;

    private final PaymentRepository paymentRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public AuctionService(AuctionRepository auctionRepository,
                          UserRepository userRepository,
                          BidRepository bidRepository,
                        PaymentRepository paymentRepository,
                          SimpMessagingTemplate messagingTemplate) {
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
        this.bidRepository = bidRepository;
        this.paymentRepository = paymentRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public AuctionItem createAuction(AuctionItem item, String ownerEmail) {
        User owner = userRepository.findByEmail(ownerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));
        item.setOwner(owner);
        return auctionRepository.save(item);
    }

    public List<AuctionItem> getAllAuctions() {
        return auctionRepository.findAll();
    }

    public AuctionItem getAuctionById(UUID id) {
        AuctionItem auction = auctionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (auction.isActive()
                && auction.getEndTime().isBefore(LocalDateTime.now())) {
            return closeAuction(auction);
        }

        return auction;
    }

    public void deleteAuction(UUID id, String email) {
        AuctionItem auction = auctionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (!auction.getOwner().getEmail().equals(email)) {
            throw new RuntimeException("You are not authorized to delete this auction.");
        }

        if (auction.isActive()) {
            throw new RuntimeException("Cannot delete an active auction.");
        }

        auctionRepository.deleteById(id);
    }

    public List<AuctionItem> getAuctionsWonByUser(UUID userId) {
        return auctionRepository.findByWinnerId(userId);
    }

    public List<AuctionItem> getMyWins(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return auctionRepository.findByWinnerId(user.getId());
    }

    public AuctionItem closeAuction(AuctionItem auction) {

        if (!auction.isActive()) {
            return auction;
        }

        auction.setActive(false);

        List<Bid> bids = bidRepository.findByAuctionItemId(auction.getId());

        Bid highestBid = bids.stream()
                .max(Comparator.comparingDouble(Bid::getAmount))
                .orElse(null);

        if (highestBid != null) {
            auction.setWinner(highestBid.getBidder());
            // Give winner 15 minutes to pay
            auction.setPaymentDeadline(LocalDateTime.now().plusMinutes(15));
        } else {
            auction.setWinner(null);
            auction.setPaymentDeadline(null);
        }

        return auctionRepository.save(auction);
    }
    public AuctionItem reopenAuction(UUID id, String sellerEmail) {
        AuctionItem auction = auctionRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (!auction.getOwner().getEmail().equals(sellerEmail)) {
            throw new RuntimeException("Only the auction owner can reopen this auction.");
        }

        if (auction.isActive()) {
            throw new RuntimeException("Auction is already active.");
        }

        if (auction.getWinner() != null) {
            throw new RuntimeException("Cannot reopen an auction that has a winner.");
        }

        // Reset auction — extend end time by 24 hours from now
        auction.setActive(true);
        auction.setEndTime(LocalDateTime.now().plusHours(24));
        auction.setCurrentPrice(auction.getStartingPrice());
        auction.setPaymentDeadline(null);

        return auctionRepository.save(auction);
    }

    public void expirePaymentAndReassign(UUID auctionId) {
        AuctionItem auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        // Check if payment was already completed
        Optional<Payment> payment = paymentRepository.findByAuctionItemId(auctionId);
        if (payment.isPresent() &&
                (payment.get().getStatus() == PaymentStatus.HELD ||
                        payment.get().getStatus() == PaymentStatus.RELEASED)) {
            System.out.println("Payment already completed for auction: " + auctionId);
            return;
        }

        System.out.println("Payment expired for auction: " + auctionId +
                " — reassigning to second highest bidder");

        // Get all bids sorted by amount descending
        List<Bid> bids = bidRepository.findByAuctionItemId(auctionId)
                .stream()
                .sorted(Comparator.comparingDouble(Bid::getAmount).reversed())
                .collect(Collectors.toList());

        User currentWinner = auction.getWinner();

        // Find next highest bidder (excluding current winner)
        Bid nextBid = bids.stream()
                .filter(b -> !b.getBidder().getId().equals(currentWinner.getId()))
                .findFirst()
                .orElse(null);

        if (nextBid != null) {
            // Assign to second highest bidder
            auction.setWinner(nextBid.getBidder());
            auction.setCurrentPrice(nextBid.getAmount());
            auction.setPaymentDeadline(LocalDateTime.now().plusMinutes(15));
            auctionRepository.save(auction);

            // Notify via WebSocket
            BidMessage message = new BidMessage();
            message.setAuctionId(auctionId.toString());
            message.setBidderEmail(nextBid.getBidder().getEmail());
            message.setAmount(nextBid.getAmount());
            message.setTimestamp(LocalDateTime.now().toString());
            messagingTemplate.convertAndSend("/topic/auction-reassigned", message);

            System.out.println("Auction reassigned to: " + nextBid.getBidder().getEmail());
        } else {
            // No second bidder — close with no winner
            auction.setWinner(null);
            auction.setPaymentDeadline(null);
            auctionRepository.save(auction);

            System.out.println("No second bidder — auction closed with no winner: " + auctionId);
        }
    }
    public List<AuctionItem> getMyLosses(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return auctionRepository.findLostAuctionsByBidderId(user.getId());
    }
}