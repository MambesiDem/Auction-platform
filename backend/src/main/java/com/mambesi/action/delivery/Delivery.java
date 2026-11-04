package com.mambesi.action.delivery;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "deliveries")
public class Delivery {

    @Id
    @GeneratedValue
    private UUID id;
    @Version private Long version;
    @Column private String pickupCode;
    @Column private String deliveryCode;
    @Column private Integer pickupCodeAttempts = 0;
    @Column private Integer deliveryCodeAttempts = 0;
    @Column private Boolean deliveryConfirmed = false;
    @Column(length=2000) private String preparationEvidence;
    @Column(length=2000) private String pickupEvidence;
    @Column(length=2000) private String deliveryEvidence;
    public String getPickupCode(){return pickupCode;}
    public void setPickupCode(String value){pickupCode=value;}
    public String getDeliveryCode(){return deliveryCode;}
    public void setDeliveryCode(String value){deliveryCode=value;}
    public int getPickupCodeAttempts(){return pickupCodeAttempts==null?0:pickupCodeAttempts;}
    public void setPickupCodeAttempts(int n){pickupCodeAttempts=n;}
    public int getDeliveryCodeAttempts(){return deliveryCodeAttempts==null?0:deliveryCodeAttempts;}
    public void setDeliveryCodeAttempts(int n){deliveryCodeAttempts=n;}
    public boolean isDeliveryConfirmed(){return Boolean.TRUE.equals(deliveryConfirmed);}
    public void setDeliveryConfirmed(boolean b){deliveryConfirmed=b;}
    public String getPreparationEvidence(){return preparationEvidence;}
    public void setPreparationEvidence(String s){preparationEvidence=s;}
    public String getPickupEvidence(){return pickupEvidence;}
    public void setPickupEvidence(String s){pickupEvidence=s;}
    public String getDeliveryEvidence(){return deliveryEvidence;}
    public void setDeliveryEvidence(String s){deliveryEvidence=s;}

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false, unique = true)
    private AuctionItem auctionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "driver_id")
    private User driver;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DeliveryStatus status;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = com.mambesi.action.common.AppTime.now();
        if (this.status == null) this.status = DeliveryStatus.PENDING;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = com.mambesi.action.common.AppTime.now();
    }

    public Delivery() {}

    public UUID getId() { return id; }

    public AuctionItem getAuctionItem() { return auctionItem; }
    public void setAuctionItem(AuctionItem auctionItem) { this.auctionItem = auctionItem; }

    public User getDriver() { return driver; }
    public void setDriver(User driver) { this.driver = driver; }

    public User getBuyer() { return buyer; }
    public void setBuyer(User buyer) { this.buyer = buyer; }

    public User getSeller() { return seller; }
    public void setSeller(User seller) { this.seller = seller; }

    public DeliveryStatus getStatus() { return status; }
    public void setStatus(DeliveryStatus status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}