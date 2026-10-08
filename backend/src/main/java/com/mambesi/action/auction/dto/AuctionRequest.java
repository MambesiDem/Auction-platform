package com.mambesi.action.auction.dto;

import jakarta.validation.constraints.*;
import java.time.LocalDateTime;

public class AuctionRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @Positive(message = "Starting price must be greater than zero")
    private double startingPrice;

    @NotNull(message = "Start time is required")
    private LocalDateTime startTime;

    @NotNull(message = "End time is required")
    private LocalDateTime endTime;

    private String imageUrl;
    private int extensionThresholdMinutes = 3;
    private int extensionDurationMinutes = 3;
    private double bidIncrement = 5.0;

    private double reservePrice = 0.0;

    public double getReservePrice() { return reservePrice; }

    public int getExtensionThresholdMinutes() { return extensionThresholdMinutes; }
    public int getExtensionDurationMinutes() { return extensionDurationMinutes; }
    public double getBidIncrement() { return bidIncrement; }

    public String getTitle() { return title; }
    public String getDescription() { return description; }
    public double getStartingPrice() { return startingPrice; }
    public LocalDateTime getStartTime() { return startTime; }
    public LocalDateTime getEndTime() { return endTime; }
    public String getImageUrl() { return imageUrl; }
}