package com.mambesi.action.payment;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue
    private UUID id;
    @Version private Long version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="original_attempt_id") private Payment originalAttempt;
    public Payment getOriginalAttempt(){return originalAttempt;} public void setOriginalAttempt(Payment p){originalAttempt=p;}
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id") private com.mambesi.action.order.Order order;
    @Column private LocalDateTime releaseDueAt;
    @Column(length=300) private String settlementReference;
    @Column(length=300) private String refundReference;
    public com.mambesi.action.order.Order getOrder(){return order;}
    public void setOrder(com.mambesi.action.order.Order o){order=o;}
    public LocalDateTime getReleaseDueAt(){return releaseDueAt;}
    public void setReleaseDueAt(LocalDateTime t){releaseDueAt=t;}
    public String getSettlementReference(){return settlementReference;}
    public void setSettlementReference(String r){settlementReference=r;}
    public String getRefundReference(){return refundReference;}
    public void setRefundReference(String r){refundReference=r;}

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "auction_id", nullable = false)
    private AuctionItem auctionItem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "buyer_id", nullable = false)
    private User buyer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seller_id", nullable = false)
    private User seller;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal totalAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal commissionAmount;

    @Column(nullable = false, precision = 19, scale = 2)
    private java.math.BigDecimal sellerAmount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PaymentStatus status;

    @Column
    private String payfastPaymentId;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime paidAt;
    private LocalDateTime releasedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = com.mambesi.action.common.AppTime.now();
        if (this.status == null) this.status = PaymentStatus.PENDING;
    }

    public Payment() {}

    public UUID getId() { return id; }

    public AuctionItem getAuctionItem() { return auctionItem; }
    public void setAuctionItem(AuctionItem auctionItem) { this.auctionItem = auctionItem; }

    public User getBuyer() { return buyer; }
    public void setBuyer(User buyer) { this.buyer = buyer; }

    public User getSeller() { return seller; }
    public void setSeller(User seller) { this.seller = seller; }

    public double getTotalAmount() { return totalAmount == null ? 0.0 : totalAmount.doubleValue(); }
    public void setTotalAmount(double totalAmount) { this.totalAmount = com.mambesi.action.common.Money.value(totalAmount); }

    public double getCommissionAmount() { return commissionAmount == null ? 0.0 : commissionAmount.doubleValue(); }
    public void setCommissionAmount(double commissionAmount) { this.commissionAmount = com.mambesi.action.common.Money.value(commissionAmount); }

    public double getSellerAmount() { return sellerAmount == null ? 0.0 : sellerAmount.doubleValue(); }
    public void setSellerAmount(double sellerAmount) { this.sellerAmount = com.mambesi.action.common.Money.value(sellerAmount); }

    public PaymentStatus getStatus() { return status; }
    public void setStatus(PaymentStatus status) { this.status = status; }

    public String getPayfastPaymentId() { return payfastPaymentId; }
    public void setPayfastPaymentId(String payfastPaymentId) { this.payfastPaymentId = payfastPaymentId; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getPaidAt() { return paidAt; }
    public void setPaidAt(LocalDateTime paidAt) { this.paidAt = paidAt; }

    public LocalDateTime getReleasedAt() { return releasedAt; }
    public void setReleasedAt(LocalDateTime releasedAt) { this.releasedAt = releasedAt; }
}