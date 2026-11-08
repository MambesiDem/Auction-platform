package com.mambesi.action.delivery.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.UUID;

// Exactly one of auctionId or orderId says what is being collected.
public record DeliveryRequest(
        UUID auctionId,
        UUID orderId,
        @NotBlank @Size(max = 2000) String preparationEvidence
) {
    public UUID getAuctionId() { return auctionId; }
    public UUID getOrderId() { return orderId; }
}