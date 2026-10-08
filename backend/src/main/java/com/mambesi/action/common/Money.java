package com.mambesi.action.common;

import java.math.BigDecimal;
import java.math.RoundingMode;

public final class Money {

    private Money() {}

    public static BigDecimal value(double value) {
        if (!Double.isFinite(value)) {
            throw new IllegalArgumentException(
                    "Amount must be a finite number."
            );
        }

        try {
            return BigDecimal.valueOf(value)
                    .setScale(2, RoundingMode.UNNECESSARY);
        } catch (ArithmeticException e) {
            throw new IllegalArgumentException(
                    "Amounts may have at most two decimal places."
            );
        }
    }

    public static BigDecimal rounded(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    public static BigDecimal fee(double price, double rate) {
        if (!Double.isFinite(rate) || rate < 0 || rate > 1) {
            throw new IllegalArgumentException(
                    "Invalid commission rate."
            );
        }

        return rounded(
                value(price).multiply(BigDecimal.valueOf(rate))
        );
    }
}