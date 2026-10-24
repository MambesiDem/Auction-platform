package com.mambesi.action.order;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.common.AppTime;
import com.mambesi.action.common.Money;
import com.mambesi.action.listing.ProductListing;
import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "orders")
public class Order {

    @Id
    @GeneratedValue
    private UUID id;

    @Version
    private Long version;

    @Column(length = 1000)
    private String listingTitle;

    @Column(length = 10000)
    private String listingDescription;

    // Remains required until product-only order handling is implemented.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private AuctionItem auctionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_listing_id")
    private ProductListing productListing;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    // Nullable during migration of existing auction orders.
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id")
    private User seller;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private OrderStatus status;

    // Saved commission policy for this order.
    @Column(nullable = false)
    private double commissionRate;

    // Total item amount: unit price multiplied by quantity.
    // Delivery charges are not included here.
    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal agreedPrice;

    // Nullable until existing orders have been backfilled.
    @Column(precision = 19, scale = 2)
    private BigDecimal unitPrice;

    // One auction item or lot counts as one unit.
    @Column
    private Integer quantity;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime paymentDeadline;

    @Column
    private LocalDateTime updatedAt;

    @Column
    private String lastActorEmail;

    @Column(length = 6000)
    private String lastReason;

    public Order() {}

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = AppTime.now();
        this.createdAt = now;
        this.updatedAt = now;

        if (this.status == null) {
            this.status = OrderStatus.AWAITING_PAYMENT;
        }

        // Populate the new fields for newly created auction orders.
        // Existing database rows require a separate backfill.
        if (this.auctionItem != null) {
            if (this.seller == null) {
                this.seller = this.auctionItem.getOwner();
            }

            if (this.quantity == null) {
                this.quantity = 1;
            }

            if (this.unitPrice == null) {
                this.unitPrice = this.agreedPrice;
            }
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = AppTime.now();
    }

    public UUID getId() {
        return id;
    }

    public String getListingTitle() {
        return listingTitle;
    }

    public void setListingTitle(String listingTitle) {
        this.listingTitle = listingTitle;
    }

    public String getListingDescription() {
        return listingDescription;
    }

    public void setListingDescription(String listingDescription) {
        this.listingDescription = listingDescription;
    }

    public AuctionItem getAuctionItem() {
        return auctionItem;
    }

    public void setAuctionItem(AuctionItem auctionItem) {
        this.auctionItem = auctionItem;
    }

    public ProductListing getProductListing() {
        return productListing;
    }

    public void setProductListing(ProductListing productListing) {
        this.productListing = productListing;
    }

    public User getBuyer() {
        return buyer;
    }

    public void setBuyer(User buyer) {
        this.buyer = buyer;
    }

    public User getSeller() {
        return seller;
    }

    public void setSeller(User seller) {
        this.seller = seller;
    }

    public OrderStatus getStatus() {
        return status;
    }

    public void setStatus(OrderStatus status) {
        this.status = status;
    }

    public double getCommissionRate() {
        return commissionRate;
    }

    public void setCommissionRate(double commissionRate) {
        this.commissionRate = commissionRate;
    }

    // Preserve the existing API for auction and payment code.
    public double getAgreedPrice() {
        return agreedPrice == null ? 0.0 : agreedPrice.doubleValue();
    }

    public void setAgreedPrice(double agreedPrice) {
        this.agreedPrice = Money.value(agreedPrice);
    }

    // Exact decimal access for future quantity calculations.
    public BigDecimal getAgreedPriceAmount() {
        return agreedPrice;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        if (unitPrice == null || unitPrice.signum() <= 0) {
            throw new IllegalArgumentException(
                    "Unit price must be greater than zero."
            );
        }

        try {
            this.unitPrice = unitPrice.setScale(
                    2,
                    RoundingMode.UNNECESSARY
            );
        } catch (ArithmeticException exception) {
            throw new IllegalArgumentException(
                    "Unit price may have at most two decimal places."
            );
        }
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        if (quantity == null || quantity < 1) {
            throw new IllegalArgumentException(
                    "Quantity must be a whole number greater than zero."
            );
        }

        this.quantity = quantity;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getPaymentDeadline() {
        return paymentDeadline;
    }

    public void setPaymentDeadline(LocalDateTime paymentDeadline) {
        this.paymentDeadline = paymentDeadline;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public String getLastActorEmail() {
        return lastActorEmail;
    }

    public void setLastActorEmail(String lastActorEmail) {
        this.lastActorEmail = lastActorEmail;
    }

    public String getLastReason() {
        return lastReason;
    }

    public void setLastReason(String lastReason) {
        this.lastReason = lastReason;
    }
}