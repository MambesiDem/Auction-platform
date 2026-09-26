package com.mambesi.action.watchlist;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface WatchlistRepository extends JpaRepository<Watchlist, UUID> {
    List<Watchlist> findByUserId(UUID userId);
    Optional<Watchlist> findByUserIdAndAuctionItemId(UUID userId, UUID auctionId);
    boolean existsByUserIdAndAuctionItemId(UUID userId, UUID auctionId);
    void deleteByUserIdAndAuctionItemId(UUID userId, UUID auctionId);
}