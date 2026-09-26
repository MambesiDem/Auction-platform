package com.mambesi.action.watchlist;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "watchlist")
public class Watchlist {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private AuctionItem auctionItem;

    @Column(nullable = false, updatable = false)
    private LocalDateTime addedAt;

    @PrePersist
    protected void onCreate() { this.addedAt = LocalDateTime.now(); }

    public Watchlist() {}

    public UUID getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public AuctionItem getAuctionItem() { return auctionItem; }
    public void setAuctionItem(AuctionItem auctionItem) { this.auctionItem = auctionItem; }
    public LocalDateTime getAddedAt() { return addedAt; }
}