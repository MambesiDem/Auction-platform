package com.mambesi.action.auction;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.*;
import java.time.LocalDateTime;
public interface AuctionRepository extends JpaRepository<AuctionItem,UUID> {
    @Override @EntityGraph(attributePaths={"owner","winner"})
    Optional<AuctionItem> findById(UUID id);
    @EntityGraph(attributePaths={"owner","winner"})
    List<AuctionItem> findByIdIn(Collection<UUID> ids);
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from AuctionItem a where a.id=:id")
    Optional<AuctionItem> findByIdForUpdate(@Param("id") UUID id);
    @EntityGraph(attributePaths={"owner","winner"})
    @Query("select a from AuctionItem a order by a.startTime desc,a.id desc")
    List<AuctionItem> findForPage(Pageable page);
    @EntityGraph(attributePaths={"owner","winner"})
    @Query("select a from AuctionItem a where a.isActive=true and a.endTime>:now order by a.endTime asc,a.id asc")
    List<AuctionItem> findOpenForPage(@Param("now")LocalDateTime now,Pageable page);
    @EntityGraph(attributePaths={"owner","winner"}) List<AuctionItem> findByOwnerIdOrderByStartTimeDesc(UUID id,Pageable page);
    @EntityGraph(attributePaths={"owner","winner"}) List<AuctionItem> findByWinnerIdOrderByEndTimeDesc(UUID id,Pageable page);
    @EntityGraph(attributePaths={"owner","winner"})
    @Query("select distinct b.auctionItem from Bid b where b.bidder.id=:userId and b.auctionItem.isActive=false and (b.auctionItem.winner is null or b.auctionItem.winner.id<>:userId) order by b.auctionItem.endTime desc")
    List<AuctionItem> findLostAuctionsByBidderId(@Param("userId")UUID id,Pageable page);
    @EntityGraph(attributePaths={"owner","winner"})
    @Query("select distinct b.auctionItem from Bid b where b.bidder.id=:userId and b.auctionItem.isActive=true order by b.auctionItem.endTime asc")
    List<AuctionItem> findActiveBidsByBidderId(@Param("userId")UUID id,Pageable page);
    @Query("select a.id from AuctionItem a where a.isActive=true and a.endTime<=:now order by a.endTime")
    List<UUID> findDueToCloseIds(@Param("now")LocalDateTime now,Pageable page);
    @Query("select distinct a.id from AuctionItem a join Order o on o.auctionItem=a where a.isActive=false and (a.offerWorkflowFinished=false or a.offerWorkflowFinished is null) and o.status=com.mambesi.action.order.OrderStatus.CANCELLED and o.lastReason='Payment deadline expired without a confirmed or unresolved payment' and not exists(select o2.id from Order o2 where o2.auctionItem=a and o2.status<>com.mambesi.action.order.OrderStatus.CANCELLED) and not exists(select r.id from RunnerUpOffer r where r.auction=a and r.status=com.mambesi.action.auction.RunnerUpOffer.Status.OFFERED and r.expiresAt>:now)")
    List<UUID> findOffersToAdvance(@Param("now")LocalDateTime now,Pageable page);
    @Query("select max(b.amount) from Bid b where b.auctionItem.id=:auctionId and b.bidder.id=:userId")
    java.math.BigDecimal findHighestBidByUserAndAuction(@Param("auctionId")UUID auctionId,@Param("userId")UUID userId);
}
