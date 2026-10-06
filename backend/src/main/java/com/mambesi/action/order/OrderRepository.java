package com.mambesi.action.order;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {
    Optional<Order> findByAuctionItemId(UUID auctionId);
    List<Order> findByBuyerId(UUID buyerId);
    List<Order> findByAuctionItemOwnerEmail(String sellerEmail);
    List<Order> findByStatus(OrderStatus status);
}