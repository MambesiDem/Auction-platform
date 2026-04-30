package com.mambesi.action.bid.dto;

import jakarta.validation.constraints.Positive;

public class BidRequest {

    @Positive(message = "Bid amount must be greater than zero")
    private double amount;

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }
}