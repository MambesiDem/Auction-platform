package com.mambesi.action.delivery.dto;

import com.mambesi.action.delivery.DeliveryStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public class DeliveryResponse {

    private UUID id;
    private UUID auctionId;
    private String auctionTitle;
    private String sellerEmail;
    private String buyerEmail;
    private String driverEmail;
    private DeliveryStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public DeliveryResponse(UUID id, UUID auctionId, String auctionTitle,
                            String sellerEmail, String buyerEmail, String driverEmail,
                            DeliveryStatus status, LocalDateTime createdAt,
                            LocalDateTime updatedAt) {
        this.id = id;
        this.auctionId = auctionId;
        this.auctionTitle = auctionTitle;
        this.sellerEmail = sellerEmail;
        this.buyerEmail = buyerEmail;
        this.driverEmail = driverEmail;
        this.status = status;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public UUID getId() { return id; }
    public UUID getAuctionId() { return auctionId; }
    public String getAuctionTitle() { return auctionTitle; }
    public String getSellerEmail() { return sellerEmail; }
    public String getBuyerEmail() { return buyerEmail; }
    public String getDriverEmail() { return driverEmail; }
    public DeliveryStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}