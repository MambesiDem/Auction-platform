package com.mambesi.action.bid;


public class BidMessage {
    private String auctionId;
    private String bidderEmail;
    private double amount;
    private String timestamp;

    public BidMessage(String auctionId, String bidderEmail, double amount, String timestamp) {
        this.auctionId = auctionId;
        this.bidderEmail = bidderEmail;
        this.amount = amount;
        this.timestamp = timestamp;
    }

    public BidMessage() {
    }

    public String getAuctionId() {
        return auctionId;
    }

    public void setAuctionId(String auctionId) {
        this.auctionId = auctionId;
    }

    public String getBidderEmail() {
        return bidderEmail;
    }

    public void setBidderEmail(String bidderEmail) {
        this.bidderEmail = bidderEmail;
    }

    public double getAmount() {
        return amount;
    }

    public void setAmount(double amount) {
        this.amount = amount;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }
}