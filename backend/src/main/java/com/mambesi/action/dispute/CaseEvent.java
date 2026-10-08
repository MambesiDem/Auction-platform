package com.mambesi.action.dispute;

import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;
@org.hibernate.annotations.Immutable
@Entity @Table(name="case_events")
public class CaseEvent {
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="case_id",nullable=false) private OrderCase orderCase;
    @Column(nullable=false) private String actor;
    @Column(nullable=false,length=4000) private String detail;
    @Column(nullable=false,updatable=false) private LocalDateTime recordedAt;
    protected CaseEvent(){}
    public CaseEvent(OrderCase c,String actor,String detail){orderCase=c;this.actor=actor;this.detail=detail;recordedAt=com.mambesi.action.common.AppTime.now();}
    public String getActor(){return actor;}public String getDetail(){return detail;}public LocalDateTime getRecordedAt(){return recordedAt;}
}
