package com.mambesi.action.order;

public enum OrderStatus {
    AWAITING_PAYMENT,
    PREPARATION,
    COLLECTION_PENDING,
    IN_TRANSIT,
    DELIVERED,
    COMPLETED,
    CANCELLED,
    RETURNING,
    DISPUTED
}