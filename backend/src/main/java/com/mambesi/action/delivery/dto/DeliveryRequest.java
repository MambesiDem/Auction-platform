package com.mambesi.action.delivery.dto;
import java.util.UUID;
import jakarta.validation.constraints.*;
public record DeliveryRequest(@NotNull UUID auctionId,@NotBlank @Size(max=2000) String preparationEvidence) {
    public UUID getAuctionId(){return auctionId;}
}
