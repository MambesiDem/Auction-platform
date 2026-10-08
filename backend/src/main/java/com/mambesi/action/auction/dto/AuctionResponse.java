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
    private String imageUrl;
    private double bidIncrement;
    private int extensionThresholdMinutes;
    private int extensionDurationMinutes;
    private double startingPrice;
    private boolean reserveMet;
    private boolean hasWinner;
    public boolean isHasWinner(){return hasWinner;} public void setHasWinner(boolean value){hasWinner=value;}
    private boolean hasBids;
    private long bidCount;
    private Double myHighestBid;
    private double nextMinimumBid;
    private boolean canPay;
    private String paymentEligibility;
    private String orderStatus;
    private UUID orderId;
    private Double commissionRate;
    public boolean isHasBids(){return hasBids;} public void setHasBids(boolean v){hasBids=v;}
    public long getBidCount(){return bidCount;} public void setBidCount(long v){bidCount=v;}
    public Double getMyHighestBid(){return myHighestBid;} public void setMyHighestBid(Double v){myHighestBid=v;}
    public double getNextMinimumBid(){return nextMinimumBid;} public void setNextMinimumBid(double v){nextMinimumBid=v;}
    public boolean isCanPay(){return canPay;} public void setCanPay(boolean v){canPay=v;}
    public String getPaymentEligibility(){return paymentEligibility;} public void setPaymentEligibility(String v){paymentEligibility=v;}
    public String getOrderStatus(){return orderStatus;} public void setOrderStatus(String v){orderStatus=v;}
    public UUID getOrderId(){return orderId;} public void setOrderId(UUID v){orderId=v;}
    public Double getCommissionRate(){return commissionRate;} public void setCommissionRate(Double v){commissionRate=v;}
    public void setPaymentDeadline(LocalDateTime v){paymentDeadline=v;}

    public AuctionResponse(UUID id, String title, String description,
                           double startingPrice,
                           double currentPrice, boolean active,
                           LocalDateTime startTime, LocalDateTime endTime,
                           String ownerEmail, String winnerEmail, LocalDateTime paymentDeadline,
                           String imageUrl, double bidIncrement,int extensionThresholdMinutes,
                           int extensionDurationMinutes, boolean reserveMet) {
        this.id = id;
        this.title = title;
        this.description = description;
        this.startingPrice = startingPrice;
        this.currentPrice = currentPrice;
        this.active = active;
        this.startTime = startTime;
        this.endTime = endTime;
        this.ownerEmail = ownerEmail;
        this.winnerEmail = winnerEmail;
        this.paymentDeadline = paymentDeadline;
        this.imageUrl = imageUrl;
        this.bidIncrement = bidIncrement;
        this.extensionThresholdMinutes = extensionThresholdMinutes;
        this.extensionDurationMinutes = extensionDurationMinutes;
        this.reserveMet = reserveMet;
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

    public String getImageUrl() { return imageUrl; }
    public double getBidIncrement() { return bidIncrement; }
    public int getExtensionThresholdMinutes() { return extensionThresholdMinutes; }
    public int getExtensionDurationMinutes() { return extensionDurationMinutes; }
    public double getStartingPrice() { return startingPrice; }
    public boolean isReserveMet() { return reserveMet; }
}
