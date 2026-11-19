package com.mambesi.action.seller;

import com.mambesi.action.common.AppTime;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "seller_profiles")
public class SellerProfile {

    // A self-declared label. Limits come from verification and settings, not from the type.
    public enum Type { INDIVIDUAL, INFORMAL_BUSINESS, REGISTERED_BUSINESS }

    public enum Status { ACTIVE, SUSPENDED }

    @Id
    @GeneratedValue
    private UUID id;

    @Version
    private Long version;

    @Enumerated(EnumType.STRING)
    @Column(name = "seller_type", nullable = false, length = 30)
    private Type sellerType;

    @Column(nullable = false, length = 150)
    private String displayName;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(nullable = false)
    private int verificationLevel = 0;

    // Null means the platform's default commission applies.
    @Column
    private Double commissionRateOverride;

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

    public SellerProfile() {}

    public UUID getId() { return id; }
    public Type getSellerType() { return sellerType; }
    public void setSellerType(Type sellerType) { this.sellerType = sellerType; }
    public String getDisplayName() { return displayName; }
    public void setDisplayName(String displayName) { this.displayName = displayName; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public int getVerificationLevel() { return verificationLevel; }
    public void setVerificationLevel(int verificationLevel) { this.verificationLevel = verificationLevel; }
    public Double getCommissionRateOverride() { return commissionRateOverride; }
    public void setCommissionRateOverride(Double value) { this.commissionRateOverride = value; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }
}