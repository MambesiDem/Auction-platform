package com.mambesi.action.payment;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface PaymentRepository extends JpaRepository<Payment, UUID> {
    Optional<Payment> findByAuctionItemId(UUID auctionId);
    List<Payment> findByBuyerId(UUID buyerId);
    List<Payment> findBySellerId(UUID sellerId);
    Optional<Payment> findByPayfastPaymentId(String payfastPaymentId);
}