package com.mambesi.action.auction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AuctionRepository extends JpaRepository<AuctionItem, UUID> {

    // Find auctions created by a specific owner
    List<AuctionItem> findByOwnerId(UUID ownerId);

    // 👇 New method: Find auctions won by a specific user
    List<AuctionItem> findByWinnerId(UUID winnerId);

    // Find closed auctions where a specific user bid but did not win
    @Query("SELECT DISTINCT b.auctionItem FROM Bid b WHERE b.bidder.id = :userId AND b.auctionItem.isActive = false AND (b.auctionItem.winner IS NULL OR b.auctionItem.winner.id != :userId)")
    List<AuctionItem> findLostAuctionsByBidderId(@Param("userId") UUID userId);
}