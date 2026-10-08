package com.mambesi.action.payment;
public enum PaymentStatus {
    PENDING, HELD, RELEASE_REQUESTED, RELEASED, REFUND_REQUESTED, REFUNDED, FAILED, REVIEW_REQUIRED
    // HELD is retained for database compatibility: it means verified buyer payment,
    // not a promise that the provider offers escrow or delayed settlement.
}
