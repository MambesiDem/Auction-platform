package com.mambesi.action.payment;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;
@org.hibernate.annotations.Immutable
@Entity @Table(name="payment_events")
public class PaymentEvent {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="payment_id",nullable=false) private Payment payment;
    @Enumerated(EnumType.STRING) private PaymentStatus fromStatus;
    @Enumerated(EnumType.STRING) private PaymentStatus toStatus;
    @Column(nullable=false,updatable=false) private LocalDateTime recordedAt;
    @Column(nullable=false) private String actor;
    @Column(nullable=false,length=4000) private String reason;
    @Column(updatable=false,precision=19,scale=2) private java.math.BigDecimal buyerCharge;
    @Column(updatable=false,precision=19,scale=2) private java.math.BigDecimal sellerEntitlement;
    @Column(updatable=false,precision=19,scale=2) private java.math.BigDecimal platformFee;
    @Column(updatable=false,precision=19,scale=2) private java.math.BigDecimal buyerRefund;
    protected PaymentEvent(){}
    public PaymentEvent(Payment p,PaymentStatus from,PaymentStatus to,String actor,String reason){payment=p;fromStatus=from;toStatus=to;this.actor=actor;this.reason=reason;recordedAt=com.mambesi.action.common.AppTime.now();
        buyerCharge=com.mambesi.action.common.Money.value(p.getTotalAmount());sellerEntitlement=com.mambesi.action.common.Money.value(p.getSellerAmount());platformFee=com.mambesi.action.common.Money.value(p.getCommissionAmount());
        buyerRefund=(to==PaymentStatus.REFUND_REQUESTED||to==PaymentStatus.REFUNDED)?buyerCharge:java.math.BigDecimal.ZERO.setScale(2);}
}
