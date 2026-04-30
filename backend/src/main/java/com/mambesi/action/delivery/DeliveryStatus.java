package com.mambesi.action.delivery;

public enum DeliveryStatus {
    PENDING,        // Delivery created, waiting for driver
    ACCEPTED,       // Driver accepted the job
    PICKED_UP,      // Driver picked up item from seller
    IN_TRANSIT,     // Item is on the way
    DELIVERED,      // Item delivered to buyer
    CANCELLED       // Delivery cancelled
}