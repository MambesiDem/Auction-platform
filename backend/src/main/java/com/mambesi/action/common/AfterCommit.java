package com.mambesi.action.common;

import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

public final class AfterCommit {
    private AfterCommit() {}
    public static void run(Runnable action) {
        if (!TransactionSynchronizationManager.isActualTransactionActive()) throw new IllegalStateException("A transaction is required.");
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { action.run(); } catch (RuntimeException e) {
                    org.slf4j.LoggerFactory.getLogger(AfterCommit.class).error("Post-commit notification failed", e);
                }
            }
        });
    }
}
