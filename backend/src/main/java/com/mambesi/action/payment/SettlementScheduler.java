package com.mambesi.action.payment;

import com.mambesi.action.common.AppTime;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SettlementScheduler {
    private final PaymentRepository payments;private final PaymentService service;
    public SettlementScheduler(PaymentRepository p, PaymentService s){payments=p;service=s;}
    @Scheduled(fixedDelay=30000) public void check(){
        for(UUID id:payments.findDueIds(PaymentStatus.HELD,AppTime.now()))try{
            Payment p=payments.findById(id).orElseThrow();service.releasePayment(p.getAuctionItem().getId());
        }catch(RuntimeException e){org.slf4j.LoggerFactory.getLogger(getClass()).error("Settlement eligibility check failed for {}",id,e);}
    }
}
