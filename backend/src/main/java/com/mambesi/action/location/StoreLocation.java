package com.mambesi.action.location;

import com.mambesi.action.common.AppTime;
import com.mambesi.action.seller.SellerProfile;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "store_locations")
public class StoreLocation {

    public enum Status { ACTIVE, ARCHIVED }

    @Id
    @GeneratedValue
    private UUID id;

    @Version
    private Long version;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_profile_id", nullable = false)
    private SellerProfile sellerProfile;

    @OneToOne(fetch = FetchType.LAZY, cascade = CascadeType.ALL, optional = false)
    @JoinColumn(name = "address_id", nullable = false, unique = true)
    private Address address;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(length = 20)
    private String phone;

    @Column(length = 300)
    private String openingHours;

    @Column(nullable = false)
    private boolean collectionAvailable;

    @Column(name = "is_default", nullable = false)
    private boolean defaultLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = AppTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = AppTime.now();
    }

    public StoreLocation() {}

    public UUID getId() { return id; }
    public SellerProfile getSellerProfile() { return sellerProfile; }
    public void setSellerProfile(SellerProfile value) { this.sellerProfile = value; }
    public Address getAddress() { return address; }
    public void setAddress(Address value) { this.address = value; }
    public String getName() { return name; }
    public void setName(String value) { this.name = value; }
    public String getPhone() { return phone; }
    public void setPhone(String value) { this.phone = value; }
    public String getOpeningHours() { return openingHours; }
    public void setOpeningHours(String value) { this.openingHours = value; }
    public boolean isCollectionAvailable() { return collectionAvailable; }
    public void setCollectionAvailable(boolean value) { this.collectionAvailable = value; }
    public boolean isDefaultLocation() { return defaultLocation; }
    public void setDefaultLocation(boolean value) { this.defaultLocation = value; }
    public Status getStatus() { return status; }
    public void setStatus(Status value) { this.status = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}