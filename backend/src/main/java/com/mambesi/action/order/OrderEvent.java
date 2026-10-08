package com.mambesi.action.order;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;
@org.hibernate.annotations.Immutable
@Entity @Table(name="order_events", indexes=@Index(name="idx_order_events_order", columnList="order_id"))
public class OrderEvent {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="order_id",nullable=false) private Order order;
    @Enumerated(EnumType.STRING) private OrderStatus fromStatus;
    @Enumerated(EnumType.STRING) private OrderStatus toStatus;
    @Column(nullable=false,updatable=false) private LocalDateTime recordedAt;
    @Column(nullable=false) private String actor;
    @Column(nullable=false,length=6000) private String reason;
    protected OrderEvent() {}
    public OrderEvent(Order order, OrderStatus from, OrderStatus to, String actor, String reason) {
        this.order=order;this.fromStatus=from;this.toStatus=to;this.actor=actor;this.reason=reason;
        this.recordedAt=com.mambesi.action.common.AppTime.now();
    }
    public UUID getId(){return id;} public OrderStatus getFromStatus(){return fromStatus;}
    public OrderStatus getToStatus(){return toStatus;} public String getActor(){return actor;}
    public String getReason(){return reason;} public LocalDateTime getRecordedAt(){return recordedAt;}
}
