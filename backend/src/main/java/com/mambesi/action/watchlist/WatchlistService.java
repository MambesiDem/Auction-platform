package com.mambesi.action.watchlist;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.UUID;

@Service
public class WatchlistService {

    private final WatchlistRepository watchlistRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    public WatchlistService(WatchlistRepository watchlistRepository,
                            AuctionRepository auctionRepository,
                            UserRepository userRepository) {
        this.watchlistRepository = watchlistRepository;
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
    }

    public List<AuctionItem> getWatchlist(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return watchlistRepository.findByUserId(user.getId())
                .stream()
                .map(Watchlist::getAuctionItem)
                .toList();
    }

    public void addToWatchlist(UUID auctionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (watchlistRepository.existsByUserIdAndAuctionItemId(user.getId(), auctionId)) {
            return; // Already in watchlist — silently ignore
        }

        AuctionItem auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        Watchlist entry = new Watchlist();
        entry.setUser(user);
        entry.setAuctionItem(auction);
        watchlistRepository.save(entry);
    }

    @Transactional
    public void removeFromWatchlist(UUID auctionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        watchlistRepository.deleteByUserIdAndAuctionItemId(user.getId(), auctionId);
    }

    public boolean isWatchlisted(UUID auctionId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
        return watchlistRepository.existsByUserIdAndAuctionItemId(user.getId(), auctionId);
    }
}