package com.mambesi.action.payment;

import com.mambesi.action.common.AppTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class SettlementScheduler {

    private static final Logger log =
            LoggerFactory.getLogger(SettlementScheduler.class);

    private final PaymentRepository payments;
    private final PaymentService service;

    public SettlementScheduler(
            PaymentRepository payments,
            PaymentService service
    ) {
        this.payments = payments;
        this.service = service;
    }

    @Scheduled(fixedDelay = 30000)
    public void check() {
        for (UUID paymentId : payments.findDueIds(
                PaymentStatus.HELD,
                AppTime.now()
        )) {
            try {
                service.releasePaymentById(paymentId);
            } catch (RuntimeException exception) {
                log.error(
                        "Settlement eligibility check failed for payment {}",
                        paymentId,
                        exception
                );
            }
        }
    }
}