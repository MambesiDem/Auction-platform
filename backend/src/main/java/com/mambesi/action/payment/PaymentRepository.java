package com.mambesi.action.payment;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.*;
import java.time.LocalDateTime;
public interface PaymentRepository extends JpaRepository<Payment,UUID>{
    @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) Optional<Payment> findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(UUID id);
    default Optional<Payment> findByAuctionItemId(UUID id){return findFirstByAuctionItemIdOrderByCreatedAtDescIdDesc(id);}
    @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) Optional<Payment> findFirstByOrderIdOrderByCreatedAtDescIdDesc(UUID id);
    @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) List<Payment> findByBuyerId(UUID id);
    @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) List<Payment> findBySellerId(UUID id);
    @Override @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) List<Payment> findAll();
    @EntityGraph(attributePaths={"order","buyer","seller","auctionItem"}) List<Payment> findByAuctionItemIdIn(Collection<UUID> ids);
    Optional<Payment> findByPayfastPaymentId(String id);
    boolean existsByAuctionItemIdAndStatusIn(UUID id,Collection<PaymentStatus> statuses);
    boolean existsByOrderIdAndStatusIn(UUID id,Collection<PaymentStatus> statuses);
    @Query("select p.id from Payment p where p.status=:status and p.releaseDueAt<=:now")
    List<UUID> findDueIds(@Param("status")PaymentStatus status,@Param("now")LocalDateTime now);
}
