package com.mambesi.action.delivery;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DeliveryRepository extends JpaRepository<Delivery, UUID> {

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    List<Delivery> findByDriverId(UUID id);

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    List<Delivery> findByBuyerId(UUID id);

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    List<Delivery> findBySellerId(UUID id);

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    List<Delivery> findByStatus(DeliveryStatus status);

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    Optional<Delivery> findByAuctionItemId(UUID id);

    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    Optional<Delivery> findByOrderId(UUID orderId);

    @Override
    @EntityGraph(attributePaths = {
            "driver", "buyer", "seller", "auctionItem", "order"
    })
    List<Delivery> findAll();
}