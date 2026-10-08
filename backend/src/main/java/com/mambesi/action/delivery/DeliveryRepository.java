package com.mambesi.action.delivery;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface DeliveryRepository extends JpaRepository<Delivery,UUID>{
    @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) List<Delivery> findByDriverId(UUID id);
    @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) List<Delivery> findByBuyerId(UUID id);
    @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) List<Delivery> findBySellerId(UUID id);
    @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) List<Delivery> findByStatus(DeliveryStatus status);
    @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) Optional<Delivery> findByAuctionItemId(UUID id);
    @Override @EntityGraph(attributePaths={"driver","buyer","seller","auctionItem"}) List<Delivery> findAll();
}
