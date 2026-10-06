package com.mambesi.action.order;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private AuctionItem auctionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    // The commission rate and bid increment locked at order creation
    @Column(nullable = false)
    private double commissionRate;

    @Column(nullable = false)
    private double agreedPrice;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime paymentDeadline;

    @Column
    private LocalDateTime updatedAt;

    // Who triggered the last status change and why
    @Column
    private String lastActorEmail;

    @Column
    private String lastReason;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        this.status = OrderStatus.AWAITING_PAYMENT;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Order() {}

    // Getters and setters
    public UUID getId() { return id; }
    public AuctionItem getAuctionItem() { return auctionItem; }
    public void setAuctionItem(AuctionItem auctionItem) { this.auctionItem = auctionItem; }
    public User getBuyer() { return buyer; }
    public void setBuyer(User buyer) { this.buyer = buyer; }
    public OrderStatus getStatus() { return status; }
    public void setStatus(OrderStatus status) { this.status = status; }
    public double getCommissionRate() { return commissionRate; }
    public void setCommissionRate(double commissionRate) { this.commissionRate = commissionRate; }
    public double getAgreedPrice() { return agreedPrice; }
    public void setAgreedPrice(double agreedPrice) { this.agreedPrice = agreedPrice; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPaymentDeadline() { return paymentDeadline; }
    public void setPaymentDeadline(LocalDateTime paymentDeadline) { this.paymentDeadline = paymentDeadline; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public String getLastActorEmail() { return lastActorEmail; }
    public void setLastActorEmail(String lastActorEmail) { this.lastActorEmail = lastActorEmail; }
    public String getLastReason() { return lastReason; }
    public void setLastReason(String lastReason) { this.lastReason = lastReason; }
}