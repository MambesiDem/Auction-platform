package com.mambesi.action.auction;

import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "auction_items")
public class AuctionItem {

    @Id
    @GeneratedValue
    private UUID id;

    @Version
    private Long version;

    @Column(nullable = false)
    private String title;

    @Column
    private LocalDateTime paymentDeadline;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private double startingPrice;

    @Column(nullable = false)
    private double currentPrice;

    @Column(nullable = false)
    private LocalDateTime startTime;

    @Column(nullable = false)
    private LocalDateTime endTime;

    @Column(nullable = false)
    private boolean isActive;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @PrePersist
    protected void onCreate() {
        this.currentPrice = this.startingPrice;
        this.isActive = true;
    }

    public AuctionItem() {
    }

    public AuctionItem(UUID id, String title, String description, double startingPrice, double currentPrice, LocalDateTime startTime, LocalDateTime endTime, boolean isActive, User owner, User winner) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.startingPrice = startingPrice;
        this.currentPrice = currentPrice;
        this.startTime = startTime;
        this.endTime = endTime;
        this.isActive = isActive;
        this.owner = owner;
        this.winner = winner;
    }

    public void setId(UUID id) {
        this.id = id;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setStartingPrice(double startingPrice) {
        this.startingPrice = startingPrice;
    }

    public void setCurrentPrice(double currentPrice) {
        this.currentPrice = currentPrice;
    }

    public void setStartTime(LocalDateTime startTime) {
        this.startTime = startTime;
    }

    public void setEndTime(LocalDateTime endTime) {
        this.endTime = endTime;
    }

    public void setActive(boolean active) {
        isActive = active;
    }

    public void setOwner(User owner) {
        this.owner = owner;
    }

    public UUID getId() {
        return id;
    }

    public String getTitle() {
        return title;
    }

    public String getDescription() {
        return description;
    }

    public double getStartingPrice() {
        return startingPrice;
    }

    public double getCurrentPrice() {
        return currentPrice;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public User getOwner() {
        return owner;
    }

    public User getWinner() {
        return winner;
    }

    public LocalDateTime getPaymentDeadline() { return paymentDeadline; }

    public void setWinner(User winner) {
        this.winner = winner;
    }
    public boolean isActive(){
        return isActive;
    }


    public void setPaymentDeadline(LocalDateTime paymentDeadline) { this.paymentDeadline = paymentDeadline; }

}