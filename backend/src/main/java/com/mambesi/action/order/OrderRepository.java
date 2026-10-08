package com.mambesi.action.order;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
import java.time.LocalDateTime;
public interface OrderRepository extends JpaRepository<Order,UUID> {
    @EntityGraph(attributePaths={"buyer","auctionItem","auctionItem.owner"})
    Optional<Order> findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(UUID auctionId);
    default Optional<Order> findByAuctionItemId(UUID id) { return findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(id); }
    @EntityGraph(attributePaths={"buyer","auctionItem","auctionItem.owner"})
    List<Order> findByBuyerIdOrderByCreatedAtDesc(UUID id);
    default List<Order> findByBuyerId(UUID id){return findByBuyerIdOrderByCreatedAtDesc(id);}
    @EntityGraph(attributePaths={"buyer","auctionItem","auctionItem.owner"})
    List<Order> findByAuctionItemOwnerEmailOrderByCreatedAtDesc(String email);
    default List<Order> findByAuctionItemOwnerEmail(String email){return findByAuctionItemOwnerEmailOrderByCreatedAtDesc(email);}
    @EntityGraph(attributePaths={"buyer","auctionItem","auctionItem.owner"})
    List<Order> findByAuctionItemIdIn(Collection<UUID> ids);
    List<Order> findByStatus(OrderStatus status);
    @Query("select o.auctionItem.id from Order o where o.status = :status and o.paymentDeadline <= :now and not exists(select p.id from Payment p where p.order=o and p.status<>com.mambesi.action.payment.PaymentStatus.FAILED)")
    List<UUID> findExpiredAuctionIds(@Param("status") OrderStatus status,@Param("now") LocalDateTime now);
}
