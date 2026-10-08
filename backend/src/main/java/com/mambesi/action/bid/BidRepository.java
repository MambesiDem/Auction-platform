package com.mambesi.action.bid;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.*;
import java.math.BigDecimal;
public interface BidRepository extends JpaRepository<Bid,UUID> {
    interface AuctionBidSummary { UUID getAuctionId();Long getBidCount();BigDecimal getMyHighestBid(); }
    @Query("select b.auctionItem.id as auctionId,count(b) as bidCount,max(case when b.bidder.id=:buyerId then b.amount else null end) as myHighestBid from Bid b where b.auctionItem.id in :ids group by b.auctionItem.id")
    List<AuctionBidSummary> summarizeForAuctions(@Param("ids")Collection<UUID> ids,@Param("buyerId")UUID buyerId);
    @EntityGraph(attributePaths={"bidder"}) Optional<Bid> findFirstByAuctionItemIdOrderByAmountDescTimestampAsc(UUID id);
    boolean existsByAuctionItemId(UUID id);
    @EntityGraph(attributePaths={"bidder"}) List<Bid> findByAuctionItemId(UUID id);
    @EntityGraph(attributePaths={"bidder"}) List<Bid> findByAuctionItemIdOrderByAmountDescTimestampAsc(UUID id,Pageable page);
}
