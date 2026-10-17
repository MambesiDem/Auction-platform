package com.mambesi.action.order;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrderRepository extends JpaRepository<Order, UUID> {

    @EntityGraph(attributePaths = {
            "buyer", "auctionItem", "auctionItem.owner"
    })
    Optional<Order> findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(
            UUID auctionId
    );

    default Optional<Order> findByAuctionItemId(UUID id) {
        return findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(id);
    }

    @EntityGraph(attributePaths = {
            "buyer", "auctionItem", "auctionItem.owner"
    })
    List<Order> findByBuyerIdOrderByCreatedAtDesc(UUID id);

    default List<Order> findByBuyerId(UUID id) {
        return findByBuyerIdOrderByCreatedAtDesc(id);
    }

    // Use the seller saved on the order, supporting both sale formats.
    @EntityGraph(attributePaths = {
            "buyer", "seller", "auctionItem", "auctionItem.owner"
    })
    List<Order> findBySellerEmailOrderByCreatedAtDesc(String email);

    // Preserve existing callers while using the saved seller.
    default List<Order> findByAuctionItemOwnerEmail(String email) {
        return findBySellerEmailOrderByCreatedAtDesc(email);
    }

    default List<Order> findByAuctionItemOwnerEmailOrderByCreatedAtDesc(
            String email
    ) {
        return findBySellerEmailOrderByCreatedAtDesc(email);
    }

    @EntityGraph(attributePaths = {
            "buyer", "auctionItem", "auctionItem.owner"
    })
    List<Order> findByAuctionItemIdIn(Collection<UUID> ids);

    List<Order> findByStatus(OrderStatus status);

    @Query("""
            select o.auctionItem.id
            from Order o
            where o.status = :status
              and o.paymentDeadline <= :now
              and not exists (
                  select p.id
                  from Payment p
                  where p.order = o
                    and p.status <> com.mambesi.action.payment.PaymentStatus.FAILED
              )
            """)
    List<UUID> findExpiredAuctionIds(
            @Param("status") OrderStatus status,
            @Param("now") LocalDateTime now
    );
}