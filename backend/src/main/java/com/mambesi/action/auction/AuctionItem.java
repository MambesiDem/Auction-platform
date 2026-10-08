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
    @Column private Double commissionRate;
    @Column private Boolean offerWorkflowFinished = false;
    public boolean isOfferWorkflowFinished(){return Boolean.TRUE.equals(offerWorkflowFinished);}
    public void setOfferWorkflowFinished(boolean b){offerWorkflowFinished=b;}
    public Double getCommissionRate() { return commissionRate; }
    public void setCommissionRate(Double value) { commissionRate = value; }

    @Column(nullable = false)
    private String title;

    @Column
    private LocalDateTime paymentDeadline;

    @Column(nullable = false,length=10000)
    private String description;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal startingPrice;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal currentPrice;

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

    @Column(length=2000)
    private String imageUrl;

    @Column(nullable = false)
    private int extensionThresholdMinutes = 3;

    @Column(nullable = false)
    private int extensionDurationMinutes = 3;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal bidIncrement = java.math.BigDecimal.valueOf(5).setScale(2);

    @Column
    private java.math.BigDecimal reservePrice;

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
        this.startingPrice = com.mambesi.action.common.Money.value(startingPrice);
        this.currentPrice = com.mambesi.action.common.Money.value(currentPrice);
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
        this.startingPrice = com.mambesi.action.common.Money.value(startingPrice);
    }

    public void setCurrentPrice(double currentPrice) {
        this.currentPrice = com.mambesi.action.common.Money.value(currentPrice);
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
        return startingPrice == null ? 0.0 : startingPrice.doubleValue();
    }

    public double getCurrentPrice() {
        return currentPrice == null ? 0.0 : currentPrice.doubleValue();
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

    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String imageUrl) { this.imageUrl = imageUrl; }
    public int getExtensionThresholdMinutes() { return extensionThresholdMinutes; }
    public void setExtensionThresholdMinutes(int m) { this.extensionThresholdMinutes = m; }
    public int getExtensionDurationMinutes() { return extensionDurationMinutes; }
    public void setExtensionDurationMinutes(int m) { this.extensionDurationMinutes = m; }
    public double getBidIncrement() { return bidIncrement == null ? 0.0 : bidIncrement.doubleValue(); }
    public void setBidIncrement(double bidIncrement) { this.bidIncrement = com.mambesi.action.common.Money.value(bidIncrement); }

    public Double getReservePrice() {
        return reservePrice == null ? null : reservePrice.doubleValue();
    }

    public void setReservePrice(Double reservedPrice) {
        this.reservePrice = reservedPrice == null || reservedPrice == 0 ? null : com.mambesi.action.common.Money.value(reservedPrice);
    }
}