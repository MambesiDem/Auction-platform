package com.mambesi.action.dispute;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
public interface OrderCaseRepository extends JpaRepository<OrderCase,UUID>{
    Optional<OrderCase> findByOrderId(UUID id);
    @Override @EntityGraph(attributePaths={"order","order.buyer","order.auctionItem","order.auctionItem.owner"}) List<OrderCase> findAll();
}
