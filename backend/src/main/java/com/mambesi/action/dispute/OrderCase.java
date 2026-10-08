package com.mambesi.action.dispute;

import com.mambesi.action.order.Order;
import com.mambesi.action.order.OrderStatus;
import com.mambesi.action.payment.PaymentStatus;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;
@Entity @Table(name="order_cases",uniqueConstraints=@UniqueConstraint(columnNames="order_id"))
public class OrderCase {
    public enum Status { OPEN, RETURN_AUTHORISED, RETURN_IN_TRANSIT, RETURN_RECEIVED, REFUND_APPROVED, REJECTED, APPEALED }
    @Id @GeneratedValue private UUID id;
    @Version private Long version;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id",nullable=false) private Order order;
    @Enumerated(EnumType.STRING) private Status status;
    @Enumerated(EnumType.STRING) private OrderStatus previousOrderStatus;
    @Enumerated(EnumType.STRING) private PaymentStatus previousPaymentStatus;
    @Column(nullable=false,length=2000) private String reason;
    @Column(length=4000) private String buyerEvidence;
    @Column(length=4000) private String sellerEvidence;
    @Column(length=4000) private String decision;
    @Column(length=4000) private String returnInstructions;
    @Column(length=2000) private String returnCostAllocation;
    @Column(length=500) private String tracking;
    @Column(length=4000) private String receiptEvidence;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @PrePersist void create(){createdAt=com.mambesi.action.common.AppTime.now();updatedAt=createdAt;}
    @PreUpdate void update(){updatedAt=com.mambesi.action.common.AppTime.now();}
    public UUID getId(){return id;}public Order getOrder(){return order;}public void setOrder(Order o){order=o;}
    public Status getStatus(){return status;}public void setStatus(Status s){status=s;}
    public OrderStatus getPreviousOrderStatus(){return previousOrderStatus;}public void setPreviousOrderStatus(OrderStatus s){previousOrderStatus=s;}
    public PaymentStatus getPreviousPaymentStatus(){return previousPaymentStatus;}public void setPreviousPaymentStatus(PaymentStatus s){previousPaymentStatus=s;}
    public String getReason(){return reason;}public void setReason(String s){reason=s;}
    public String getBuyerEvidence(){return buyerEvidence;}public void setBuyerEvidence(String s){buyerEvidence=s;}
    public String getSellerEvidence(){return sellerEvidence;}public void setSellerEvidence(String s){sellerEvidence=s;}
    public String getDecision(){return decision;}public void setDecision(String s){decision=s;}
    public String getReturnInstructions(){return returnInstructions;}public void setReturnInstructions(String s){returnInstructions=s;}
    public String getReturnCostAllocation(){return returnCostAllocation;}public void setReturnCostAllocation(String s){returnCostAllocation=s;}
    public String getTracking(){return tracking;}public void setTracking(String s){tracking=s;}
    public String getReceiptEvidence(){return receiptEvidence;}public void setReceiptEvidence(String s){receiptEvidence=s;}
    public LocalDateTime getCreatedAt(){return createdAt;}public LocalDateTime getUpdatedAt(){return updatedAt;}
}
