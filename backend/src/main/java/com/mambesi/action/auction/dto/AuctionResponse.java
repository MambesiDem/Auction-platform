package com.mambesi.action.auction.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class AuctionResponse {

    private UUID id;
    private String title;
    private String description;
    private double currentPrice;
    private boolean active;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String ownerEmail;
    private String winnerEmail;
    private LocalDateTime paymentDeadline;

    public AuctionResponse(UUID id, String title, String description,
                           double currentPrice, boolean active,
                           LocalDateTime startTime, LocalDateTime endTime,
                           String ownerEmail, String winnerEmail, LocalDateTime paymentDeadline) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.currentPrice = currentPrice;
        this.active = active;
        this.startTime = startTime;
        this.endTime = endTime;
        this.ownerEmail = ownerEmail;
        this.winnerEmail = winnerEmail;
        this.paymentDeadline = paymentDeadline;
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

    public double getCurrentPrice() {
        return currentPrice;
    }

    public boolean isActive() {
        return active;
    }

    public LocalDateTime getStartTime() {
        return startTime;
    }

    public LocalDateTime getEndTime() {
        return endTime;
    }

    public String getOwnerEmail() {
        return ownerEmail;
    }

    public String getWinnerEmail() {
        return winnerEmail;
    }
    public LocalDateTime getPaymentDeadline() { return paymentDeadline; }
}
