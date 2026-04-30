package com.mambesi.action.bid.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public class BidResponse {

    private UUID id;
    private double amount;
    private String bidderEmail;
    private LocalDateTime timestamp;

    public BidResponse(UUID id, double amount, String bidderEmail, LocalDateTime timestamp) {
        this.id = id;
        this.amount = amount;
        this.bidderEmail = bidderEmail;
        this.timestamp = timestamp;
    }

    public UUID getId() {
        return id;
    }

    public double getAmount() {
        return amount;
    }

    public String getBidderEmail() {
        return bidderEmail;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }
}