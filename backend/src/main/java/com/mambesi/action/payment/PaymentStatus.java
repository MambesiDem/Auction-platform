package com.mambesi.action.payment;

public enum PaymentStatus {
    PENDING,    // Awaiting buyer payment
    HELD,       // Paid, funds held in escrow
    RELEASED,   // Funds released to seller after delivery
    REFUNDED,   // Buyer refunded (cancelled delivery)
    FAILED      // Payment failed or expired
}