package com.mambesi.action.auction;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface AuctionRepository extends JpaRepository<AuctionItem, UUID> {

    // Find auctions created by a specific owner
    List<AuctionItem> findByOwnerId(UUID ownerId);

    // 👇 New method: Find auctions won by a specific user
    List<AuctionItem> findByWinnerId(UUID winnerId);
}