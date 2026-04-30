package com.mambesi.action.delivery.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public class DeliveryRequest {

    @NotNull(message = "Auction ID is required")
    private UUID auctionId;

    public UUID getAuctionId() {
        return auctionId;
    }

    public void setAuctionId(UUID auctionId) {
        this.auctionId = auctionId;
    }
}