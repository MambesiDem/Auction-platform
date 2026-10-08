package com.mambesi.action.auction;

import com.mambesi.action.user.User;
import jakarta.persistence.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity @Table(name="runner_up_offers",uniqueConstraints=@UniqueConstraint(columnNames={"auction_id","buyer_id"}))
public class RunnerUpOffer {
    public enum Status { OFFERED,ACCEPTED,DECLINED,EXPIRED }
    @Id @GeneratedValue private UUID id;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="auction_id",nullable=false) private AuctionItem auction;
    @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="buyer_id",nullable=false) private User buyer;
    @Column(nullable=false,precision=19,scale=2) private java.math.BigDecimal amount;
    @Column(nullable=false) private LocalDateTime expiresAt;
    @Enumerated(EnumType.STRING) private Status status;
    protected RunnerUpOffer(){}
    public RunnerUpOffer(AuctionItem a, User b, double price, int minutes){auction=a;buyer=b;amount=com.mambesi.action.common.Money.value(price);expiresAt=com.mambesi.action.common.AppTime.now().plusMinutes(minutes);status= Status.OFFERED;}
    public UUID getId(){return id;}public AuctionItem getAuction(){return auction;}public User getBuyer(){return buyer;}
    public double getAmount(){return amount.doubleValue();}public LocalDateTime getExpiresAt(){return expiresAt;}public Status getStatus(){return status;}
    public void setStatus(Status value){status=value;}
}
