package com.mambesi.action.delivery;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {

    // All deliveries assigned to a specific driver
    List<Delivery> findByDriverId(UUID driverId);

    // All deliveries for a specific buyer
    List<Delivery> findByBuyerId(UUID buyerId);

    // All deliveries for a specific seller
    List<Delivery> findBySellerId(UUID sellerId);

    // All pending deliveries (no driver yet)
    List<Delivery> findByStatus(DeliveryStatus status);

    Optional<Delivery> findByAuctionItemId(UUID auctionItemId);
}