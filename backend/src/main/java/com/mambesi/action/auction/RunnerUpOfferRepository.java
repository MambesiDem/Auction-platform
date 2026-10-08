package com.mambesi.action.auction;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

public interface RunnerUpOfferRepository extends JpaRepository<RunnerUpOffer,UUID>{
    @EntityGraph(attributePaths={"auction","buyer"}) List<RunnerUpOffer> findByBuyerEmailAndStatus(String email,RunnerUpOffer.Status status);
    boolean existsByAuctionIdAndStatus(UUID id,RunnerUpOffer.Status status);
    boolean existsByAuctionIdAndBuyerId(UUID auction,UUID buyer);
    @Query("select o.auction.id from RunnerUpOffer o where o.status=:status and o.expiresAt<=:now")
    List<UUID> findExpiredAuctionIds(@Param("status")RunnerUpOffer.Status status,@Param("now")LocalDateTime now);
    List<RunnerUpOffer> findByAuctionIdAndStatus(UUID id,RunnerUpOffer.Status status);
}
