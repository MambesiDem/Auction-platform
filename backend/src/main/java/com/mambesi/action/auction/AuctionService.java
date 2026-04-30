package com.mambesi.action.auction;

import com.mambesi.action.bid.Bid;
import com.mambesi.action.bid.BidRepository;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
public class AuctionService {

    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;
    private final BidRepository bidRepository;

    public AuctionService(AuctionRepository auctionRepository,
                          UserRepository userRepository,
                          BidRepository bidRepository) {
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
        this.bidRepository = bidRepository;
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
        } else {
            auction.setWinner(null);
        }

        return auctionRepository.save(auction);
    }
}