package com.mambesi.action.payment;

import com.mambesi.action.auction.*;
import com.mambesi.action.order.*;
import com.mambesi.action.delivery.*;
import com.mambesi.action.common.*;
import com.mambesi.action.notification.EmailService;
import com.mambesi.action.payment.dto.PaymentResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class PaymentService {

    @org.springframework.beans.factory.annotation.Autowired
    private com.mambesi.action.user.UserRepository users;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private final PaymentRepository payments;
    private final AuctionRepository auctions;
    private final OrderService orders;
    private final DeliveryRepository deliveries;
    private final PaymentEventRepository events;
    private final PayfastClient provider;
    private final EmailService email;

    public PaymentService(
            PaymentRepository p,
            AuctionRepository a,
            OrderService o,
            DeliveryRepository d,
            PaymentEventRepository e,
            PayfastClient f,
            EmailService m
    ) {
        payments = p;
        auctions = a;
        orders = o;
        deliveries = d;
        events = e;
        provider = f;
        email = m;
    }

    @Transactional
    public String initiatePayment(UUID auctionId, String buyer) {
        provider.requireCheckoutAllowed();

        AuctionItem auction = lock(auctionId);
        Order order = orders.getByAuctionId(auctionId);

        if (auction.isActive()
                || !order.getBuyer().getEmail().equals(buyer)
                || auction.getWinner() == null
                || !auction.getWinner().getId()
                .equals(order.getBuyer().getId())) {
            throw new SecurityException(
                    "Only the current committed buyer can pay."
            );
        }

        if (order.getStatus() != OrderStatus.AWAITING_PAYMENT
                || order.getPaymentDeadline() == null
                || !AppTime.now().isBefore(order.getPaymentDeadline())) {
            throw new IllegalArgumentException(
                    "Payment is not available for this order. "
                            + "If you already attempted payment, contact support."
            );
        }

        Optional<Payment> latest = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId());

        if (latest.isPresent()
                && latest.get().getStatus() == PaymentStatus.PENDING) {
            // Resume the existing attempt rather than creating another one.
            return provider.checkout(latest.get());
        }

        if (latest.isPresent()
                && latest.get().getStatus() != PaymentStatus.FAILED) {
            throw new IllegalArgumentException(
                    "This order already has a confirmed or unresolved payment."
            );
        }

        Payment payment = new Payment();
        payment.setAuctionItem(auction);
        payment.setOrder(order);
        payment.setBuyer(order.getBuyer());
        payment.setSeller(auction.getOwner());
        payment.setTotalAmount(order.getAgreedPrice());

        var fee = Money.fee(
                order.getAgreedPrice(),
                order.getCommissionRate()
        );

        payment.setCommissionAmount(fee.doubleValue());
        payment.setSellerAmount(
                Money.value(order.getAgreedPrice())
                        .subtract(fee)
                        .doubleValue()
        );
        payment.setStatus(PaymentStatus.PENDING);

        payments.saveAndFlush(payment);

        events.save(new PaymentEvent(
                payment,
                null,
                PaymentStatus.PENDING,
                buyer,
                "Hosted checkout attempt created"
        ));

        return provider.checkout(payment);
    }

    // Validate with the provider before entering the financial transaction,
    // so provider network calls do not hold auction locks.
    public ValidatedNotification validateNotification(
            String raw,
            String remote,
            String forwarded
    ) {
        var data = provider.parse(raw);
        UUID paymentId;

        try {
            paymentId = UUID.fromString(data.get("m_payment_id"));
        } catch (Exception exception) {
            throw new IllegalArgumentException(
                    "Invalid payment reference."
            );
        }

        Payment payment = payments.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment attempt not found."
                ));

        provider.validate(
                data,
                remote,
                forwarded,
                payment.getTotalAmount()
        );

        String status = data.get("payment_status");
        String reference = data.get("pf_payment_id");

        if (reference == null || reference.isBlank()) {
            throw new IllegalArgumentException(
                    "Provider transaction reference is required."
            );
        }

        if (!Set.of("COMPLETE", "FAILED", "CANCELLED").contains(status)) {
            throw new IllegalArgumentException(
                    "Unsupported payment notification status."
            );
        }

        return new ValidatedNotification(
                paymentId,
                reference,
                status
        );
    }

    public record ValidatedNotification(
            UUID paymentId,
            String providerId,
            String status
    ) {}

    @Transactional
    public void applyNotification(ValidatedNotification notification) {
        Payment payment = payments.findById(notification.paymentId())
                .orElseThrow();

        lock(payment.getAuctionItem().getId());
        entityManager.refresh(payment);

        Optional<Payment> other = payments.findByPayfastPaymentId(
                notification.providerId()
        );

        if (other.isPresent()
                && !other.get().getId().equals(payment.getId())) {

            if (other.get().getOriginalAttempt() != null
                    && other.get().getOriginalAttempt().getId()
                    .equals(payment.getId())) {
                return;
            }

            throw new SecurityException(
                    "Provider transaction is already linked to another attempt."
            );
        }

        if (payment.getPayfastPaymentId() != null
                && !payment.getPayfastPaymentId()
                .equals(notification.providerId())) {

            if (!"COMPLETE".equals(notification.status())) {
                return;
            }

            // A resumed checkout can produce another genuine charge.
            // Record it for refund review without creating another sale.
            Payment extra = new Payment();
            extra.setOriginalAttempt(payment);
            extra.setAuctionItem(payment.getAuctionItem());
            extra.setBuyer(payment.getBuyer());
            extra.setSeller(payment.getSeller());
            extra.setTotalAmount(payment.getTotalAmount());
            extra.setCommissionAmount(0);
            extra.setSellerAmount(0);
            extra.setPaidAt(AppTime.now());
            extra.setPayfastPaymentId(notification.providerId());
            extra.setStatus(PaymentStatus.REVIEW_REQUIRED);

            payments.save(extra);

            events.save(new PaymentEvent(
                    extra,
                    null,
                    PaymentStatus.REVIEW_REQUIRED,
                    "provider",
                    "Additional verified charge on resumed checkout; refund review required"
            ));

            return;
        }

        if (!"COMPLETE".equals(notification.status())) {
            if (payment.getStatus() == PaymentStatus.PENDING) {
                payment.setPayfastPaymentId(notification.providerId());

                change(
                        payment,
                        PaymentStatus.FAILED,
                        "provider",
                        "Verified failed or cancelled payment notification"
                );
            }

            return;
        }

        // A repeated success must not reverse a refund or payout state.
        if (payment.getStatus() != PaymentStatus.PENDING
                && payment.getStatus() != PaymentStatus.FAILED) {
            return;
        }

        payment.setPayfastPaymentId(notification.providerId());
        payment.setPaidAt(AppTime.now());

        Order order = payment.getOrder();

        if (order == null
                || order.getStatus() != OrderStatus.AWAITING_PAYMENT) {
            change(
                    payment,
                    PaymentStatus.REVIEW_REQUIRED,
                    "provider",
                    "Payment received for an order that is no longer awaiting payment; review/refund required"
            );

            return;
        }

        change(
                payment,
                PaymentStatus.HELD,
                "provider",
                "Buyer payment verified; no escrow or payout is implied"
        );

        orders.transitionStatus(
                order.getId(),
                OrderStatus.PREPARATION,
                "provider",
                "Verified buyer payment"
        );

        AfterCommit.run(() -> {
            email.sendPaymentConfirmedEmail(
                    payment.getBuyer().getEmail(),
                    payment.getAuctionItem().getTitle(),
                    payment.getTotalAmount()
            );

            email.sendSellerPaymentReceivedEmail(
                    payment.getSeller().getEmail(),
                    payment.getAuctionItem().getTitle(),
                    payment.getSellerAmount()
            );
        });
    }

    @Transactional
    public Payment cancelPayment(UUID auctionId, String buyer) {
        lock(auctionId);

        Order order = orders.getByAuctionId(auctionId);

        if (!order.getBuyer().getEmail().equals(buyer)) {
            throw new SecurityException(
                    "This order belongs to another buyer."
            );
        }

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment found."
                ));

        if (payment.getStatus() == PaymentStatus.REFUND_REQUESTED
                || payment.getStatus() == PaymentStatus.REFUNDED) {
            return payment;
        }

        if (payment.getStatus() != PaymentStatus.HELD
                || !Set.of(
                OrderStatus.PREPARATION,
                OrderStatus.COLLECTION_PENDING
        ).contains(order.getStatus())) {
            throw new IllegalArgumentException(
                    "Use the problem-reporting process after pickup."
            );
        }

        Optional<Delivery> job = deliveries.findByAuctionItemId(auctionId);

        if (job.isPresent()) {
            Delivery delivery = job.get();

            if (!Set.of(
                    DeliveryStatus.PENDING,
                    DeliveryStatus.ACCEPTED
            ).contains(delivery.getStatus())) {
                throw new IllegalArgumentException(
                        "The item has already been collected."
                );
            }

            delivery.setStatus(DeliveryStatus.CANCELLED);
            deliveries.save(delivery);
        }

        orders.transitionStatus(
                order.getId(),
                OrderStatus.CANCELLED,
                buyer,
                "Buyer requested cancellation before pickup"
        );

        payment.setReleaseDueAt(null);

        change(
                payment,
                PaymentStatus.REFUND_REQUESTED,
                buyer,
                "Cancellation approved; provider refund still required"
        );

        return payment;
    }

    // Compatibility for existing callers supplying an auction ID.
    @Transactional
    public void scheduleRelease(UUID auctionId) {
        lock(auctionId);

        Order order = orders.getByAuctionId(auctionId);
        scheduleReleaseForOrder(order.getId());
    }

    @Transactional
    public void scheduleReleaseForOrder(UUID orderId) {
        Payment initial = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found for this order."
                ));

        Payment payment = lockSettlementPayment(initial.getId());
        Order order = payment.getOrder();

        Delivery delivery = deliveries.findByOrderId(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Delivery not found for this order."
                ));

        if (delivery.getStatus() != DeliveryStatus.DELIVERED
                || !delivery.isDeliveryConfirmed()
                || order.getStatus() != OrderStatus.DELIVERED
                || payment.getStatus() != PaymentStatus.HELD) {
            throw new IllegalArgumentException(
                    "Confirmed handover is required before settlement eligibility."
            );
        }

        // Five minutes is a sandbox review window, not a deadline for claims.
        // Scheduling eligibility does not initiate a money transfer.
        if (payment.getReleaseDueAt() == null) {
            payment.setReleaseDueAt(AppTime.now().plusMinutes(5));
            payments.save(payment);
        }
    }

    // Compatibility for existing callers supplying an auction ID.
    @Transactional
    public Payment releasePayment(UUID auctionId) {
        lock(auctionId);

        Order order = orders.getByAuctionId(auctionId);

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found for this order."
                ));

        return releasePaymentById(payment.getId());
    }

    @Transactional
    public Payment releasePaymentById(UUID paymentId) {
        Payment payment = lockSettlementPayment(paymentId);
        Order order = payment.getOrder();

        if (payment.getStatus() != PaymentStatus.HELD
                || payment.getReleaseDueAt() == null
                || AppTime.now().isBefore(payment.getReleaseDueAt())
                || order.getStatus() != OrderStatus.DELIVERED) {
            return payment;
        }

        Delivery delivery = deliveries.findByOrderId(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Delivery not found for this order."
                ));

        if (delivery.getStatus() != DeliveryStatus.DELIVERED
                || !delivery.isDeliveryConfirmed()) {
            return payment;
        }

        change(
                payment,
                PaymentStatus.RELEASE_REQUESTED,
                "system",
                "Settlement eligible after documented delivery; provider payout not yet confirmed"
        );

        return payment;
    }

    private Payment lockSettlementPayment(UUID paymentId) {
        Payment payment = payments.findById(paymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found."
                ));

        // Keep the existing shared auction lock during this migration.
        // Product checkout needs its own locking support before activation.
        if (payment.getAuctionItem() == null) {
            throw new IllegalStateException(
                    "Settlement for non-auction payments is not enabled yet."
            );
        }

        lock(payment.getAuctionItem().getId());
        entityManager.refresh(payment);

        Order order = payment.getOrder();

        if (order == null) {
            throw new IllegalStateException(
                    "This payment is missing its order reference. Contact support."
            );
        }

        // Read current order state after acquiring the shared lock.
        entityManager.refresh(order);

        return payment;
    }

    @Transactional
    public Payment recordSettlement(
            UUID id,
            boolean refund,
            String reference,
            String admin
    ) {
        Payment payment = payments.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found."
                ));

        lock(payment.getAuctionItem().getId());
        entityManager.refresh(payment);

        if (reference == null
                || reference.isBlank()
                || reference.length() > 300) {
            throw new IllegalArgumentException(
                    "A provider/bank reconciliation reference is required."
            );
        }

        if (provider.isSandbox()
                && !reference.startsWith("SANDBOX-")) {
            throw new IllegalArgumentException(
                    "Sandbox confirmations must use a SANDBOX- reference; "
                            + "they do not transfer money."
            );
        }

        if (!provider.isSandbox()
                && reference.startsWith("SANDBOX-")) {
            throw new IllegalArgumentException(
                    "A sandbox reference cannot confirm a live transfer."
            );
        }

        Order order = payment.getOrder();

        if (order == null && !refund) {
            throw new IllegalArgumentException(
                    "An order is required for seller payout."
            );
        }

        if (refund) {
            if (payment.getStatus() != PaymentStatus.REFUND_REQUESTED) {
                throw new IllegalArgumentException(
                        "Refund must first be approved and requested."
                );
            }

            payment.setRefundReference(reference);

            change(
                    payment,
                    PaymentStatus.REFUNDED,
                    admin,
                    "External provider refund reconciled: " + reference
            );
        } else {
            if (payment.getStatus() != PaymentStatus.RELEASE_REQUESTED
                    || order == null
                    || order.getStatus() != OrderStatus.DELIVERED) {
                throw new IllegalArgumentException(
                        "Settlement is paused or not eligible."
                );
            }

            payment.setSettlementReference(reference);
            payment.setReleasedAt(AppTime.now());

            change(
                    payment,
                    PaymentStatus.RELEASED,
                    admin,
                    "External seller payout reconciled: " + reference
            );

            orders.transitionStatus(
                    order.getId(),
                    OrderStatus.COMPLETED,
                    admin,
                    "Seller payout reconciled"
            );
        }

        return payment;
    }

    @Transactional
    public Payment reconcileAttempt(
            UUID id,
            String action,
            String reference,
            String reason,
            String admin
    ) {
        Payment payment = payments.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found."
                ));

        lock(payment.getAuctionItem().getId());
        entityManager.refresh(payment);

        if (reference == null
                || reference.isBlank()
                || reference.length() > 300
                || reason == null
                || reason.isBlank()
                || reason.length() > 2000) {
            throw new IllegalArgumentException(
                    "Record the external provider reconciliation reference "
                            + "and investigation result."
            );
        }

        if ("FAILED".equals(action)
                && payment.getStatus() == PaymentStatus.PENDING) {
            change(
                    payment,
                    PaymentStatus.FAILED,
                    admin,
                    "Provider reconciliation confirms this attempt cannot complete: "
                            + reference + ". " + reason
            );
        } else if ("REFUND_REQUESTED".equals(action)
                && payment.getStatus() == PaymentStatus.REVIEW_REQUIRED) {
            change(
                    payment,
                    PaymentStatus.REFUND_REQUESTED,
                    admin,
                    "Refund approved after reconciliation: "
                            + reference + ". " + reason
            );
        } else {
            throw new IllegalArgumentException(
                    "Only an unresolved pending attempt can be confirmed failed, "
                            + "or a reviewed payment approved for refund."
            );
        }

        return payment;
    }

    public void change(
            Payment payment,
            PaymentStatus status,
            String actor,
            String reason
    ) {
        PaymentStatus previous = payment.getStatus();

        if (previous == status) {
            return;
        }

        payment.setStatus(status);
        payments.save(payment);

        events.save(new PaymentEvent(
                payment,
                previous,
                status,
                actor,
                reason
        ));
    }

    public List<Payment> getPaymentsForBuyer(String email) {
        return payments.findByBuyerId(
                users.findByEmail(email).orElseThrow().getId()
        );
    }

    public List<Payment> getPaymentsForSeller(String email) {
        return payments.findBySellerId(
                users.findByEmail(email).orElseThrow().getId()
        );
    }

    public Payment getPaymentByAuctionId(UUID id, String buyer) {
        Order order = orders.getByAuctionId(id);

        if (!order.getBuyer().getEmail().equals(buyer)) {
            throw new SecurityException(
                    "This payment belongs to another buyer."
            );
        }

        return payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Payment not found."
                ));
    }

    public List<Payment> getAllPayments() {
        return payments.findAll();
    }

    public PaymentResponse mapToResponse(Payment payment) {
        PaymentResponse response = new PaymentResponse(
                payment.getId(),
                payment.getAuctionItem().getId(),
                payment.getAuctionItem().getTitle(),
                payment.getBuyer().getEmail(),
                payment.getSeller().getEmail(),
                payment.getTotalAmount(),
                payment.getCommissionAmount(),
                payment.getSellerAmount(),
                payment.getStatus(),
                payment.getCreatedAt(),
                payment.getPaidAt(),
                payment.getReleasedAt()
        );

        response.setOrderId(
                payment.getOrder() == null
                        ? null
                        : payment.getOrder().getId()
        );
        response.setCreatedAt(payment.getCreatedAt());
        response.setRefundReference(payment.getRefundReference());
        response.setSettlementReference(payment.getSettlementReference());

        return response;
    }

    private AuctionItem lock(UUID id) {
        return auctions.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Auction not found."
                ));
    }
}