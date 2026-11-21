package com.mambesi.action.seller;

import com.mambesi.action.common.AppTime;
import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "seller_members",
        uniqueConstraints = @UniqueConstraint(columnNames = {"seller_profile_id", "user_id"})
)
public class SellerMember {

    public enum Role {
        OWNER(true, true),
        ADMINISTRATOR(true, true),
        STORE_MANAGER(true, true),
        SALES(false, true),
        VIEWER(false, false);

        private final boolean manageListings;
        private final boolean fulfil;

        Role(boolean manageListings, boolean fulfil) {
            this.manageListings = manageListings;
            this.fulfil = fulfil;
        }

        public boolean canManageListings() { return manageListings; }
        public boolean canFulfil() { return fulfil; }
    }

    public enum Status { ACTIVE, REMOVED }

    @Id
    @GeneratedValue
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seller_profile_id", nullable = false)
    private SellerProfile sellerProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status = Status.ACTIVE;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = AppTime.now();
    }

    protected SellerMember() {}

    public SellerMember(SellerProfile sellerProfile, User user, Role role) {
        this.sellerProfile = sellerProfile;
        this.user = user;
        this.role = role;
    }

    public UUID getId() { return id; }
    public SellerProfile getSellerProfile() { return sellerProfile; }
    public User getUser() { return user; }
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}