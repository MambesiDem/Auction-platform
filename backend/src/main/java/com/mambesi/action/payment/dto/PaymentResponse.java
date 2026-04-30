package com.mambesi.action.payment.dto;

import com.mambesi.action.payment.PaymentStatus;

import java.time.LocalDateTime;
import java.util.UUID;

public class PaymentResponse {

    private UUID id;
    private UUID auctionId;
    private String auctionTitle;
    private String buyerEmail;
    private String sellerEmail;
    private double totalAmount;
    private double commissionAmount;
    private double sellerAmount;
    private PaymentStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime paidAt;
    private LocalDateTime releasedAt;

    public PaymentResponse(UUID id, UUID auctionId, String auctionTitle,
                           String buyerEmail, String sellerEmail,
                           double totalAmount, double commissionAmount,
                           double sellerAmount, PaymentStatus status,
                           LocalDateTime createdAt, LocalDateTime paidAt,
                           LocalDateTime releasedAt) {
        this.id = id;
        this.auctionId = auctionId;
        this.auctionTitle = auctionTitle;
        this.buyerEmail = buyerEmail;
        this.sellerEmail = sellerEmail;
        this.totalAmount = totalAmount;
        this.commissionAmount = commissionAmount;
        this.sellerAmount = sellerAmount;
        this.status = status;
        this.createdAt = createdAt;
        this.paidAt = paidAt;
        this.releasedAt = releasedAt;
    }

    public UUID getId() { return id; }
    public UUID getAuctionId() { return auctionId; }
    public String getAuctionTitle() { return auctionTitle; }
    public String getBuyerEmail() { return buyerEmail; }
    public String getSellerEmail() { return sellerEmail; }
    public double getTotalAmount() { return totalAmount; }
    public double getCommissionAmount() { return commissionAmount; }
    public double getSellerAmount() { return sellerAmount; }
    public PaymentStatus getStatus() { return status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public LocalDateTime getReleasedAt() { return releasedAt; }
}