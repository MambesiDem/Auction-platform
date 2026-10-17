package com.mambesi.action.dispute;

import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.delivery.DeliveryRepository;
import com.mambesi.action.delivery.DeliveryStatus;
import com.mambesi.action.order.Order;
import com.mambesi.action.order.OrderRepository;
import com.mambesi.action.order.OrderService;
import com.mambesi.action.order.OrderStatus;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentService;
import com.mambesi.action.payment.PaymentStatus;
import com.mambesi.action.user.Role;
import com.mambesi.action.user.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class CaseService {

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    private final OrderCaseRepository cases;
    private final CaseEventRepository events;
    private final OrderRepository orders;
    private final OrderService workflow;
    private final AuctionRepository auctions;
    private final PaymentRepository payments;
    private final PaymentService money;
    private final DeliveryRepository deliveries;

    public CaseService(
            OrderCaseRepository c,
            CaseEventRepository e,
            OrderRepository o,
            OrderService w,
            AuctionRepository a,
            PaymentRepository p,
            PaymentService m,
            DeliveryRepository d
    ) {
        cases = c;
        events = e;
        orders = o;
        workflow = w;
        auctions = a;
        payments = p;
        money = m;
        deliveries = d;
    }

    @Transactional
    public OrderCase open(
            UUID orderId,
            User buyer,
            String reason,
            String evidence
    ) {
        Order order = lockedOrder(orderId);

        if (!order.getBuyer().getId().equals(buyer.getId())) {
            throw new SecurityException(
                    "Only this order's buyer can report a problem."
            );
        }

        text(reason, 2000);
        text(evidence, 4000);

        if (cases.findByOrderId(orderId).isPresent()) {
            throw new IllegalArgumentException(
                    "A case already exists. Reply to it or appeal its decision."
            );
        }

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(orderId)
                .orElseThrow();

        if (!Set.of(
                PaymentStatus.HELD,
                PaymentStatus.RELEASE_REQUESTED,
                PaymentStatus.RELEASED
        ).contains(payment.getStatus())
                || order.getStatus() == OrderStatus.CANCELLED) {
            throw new IllegalArgumentException(
                    "This order is not eligible for this reporting route. "
                            + "Contact support about unresolved payment or refund issues."
            );
        }

        OrderCase orderCase = new OrderCase();
        orderCase.setOrder(order);
        orderCase.setStatus(OrderCase.Status.OPEN);
        orderCase.setReason(reason);
        orderCase.setBuyerEvidence(evidence);
        orderCase.setPreviousOrderStatus(order.getStatus());
        orderCase.setPreviousPaymentStatus(payment.getStatus());

        cases.save(orderCase);

        workflow.transitionStatus(
                order.getId(),
                OrderStatus.DISPUTED,
                buyer.getEmail(),
                "Buyer problem report: " + reason
        );

        payment.setReleaseDueAt(null);

        if (payment.getStatus() == PaymentStatus.RELEASE_REQUESTED) {
            money.change(
                    payment,
                    PaymentStatus.HELD,
                    buyer.getEmail(),
                    "Unconfirmed settlement paused for dispute"
            );
        } else {
            payments.save(payment);
        }

        record(orderCase, buyer, "Case opened. " + reason);

        return orderCase;
    }

    @Transactional
    public OrderCase respond(UUID id, User user, String evidence) {
        OrderCase orderCase = lockedCase(id);

        requireParticipant(orderCase, user);
        text(evidence, 4000);

        if (orderCase.getStatus() == OrderCase.Status.REFUND_APPROVED) {
            throw new IllegalArgumentException(
                    "Refund is already approved; contact support for any further issue."
            );
        }

        if (user.getId().equals(orderCase.getOrder().getBuyer().getId())) {
            orderCase.setBuyerEvidence(evidence);
        } else {
            orderCase.setSellerEvidence(evidence);
        }

        cases.save(orderCase);
        record(orderCase, user, "Evidence submitted: " + evidence);

        return orderCase;
    }

    @Transactional
    public OrderCase decide(
            UUID id,
            User admin,
            String outcome,
            String reason,
            String instructions,
            String costs
    ) {
        requireAdmin(admin);

        OrderCase orderCase = lockedCase(id);
        text(reason, 4000);

        if (!Set.of(
                OrderCase.Status.OPEN,
                OrderCase.Status.APPEALED,
                OrderCase.Status.RETURN_RECEIVED
        ).contains(orderCase.getStatus())) {
            throw new IllegalArgumentException(
                    "Review an open case or inspected return before deciding."
            );
        }

        Order order = orderCase.getOrder();

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow();

        switch (outcome) {
            case "RETURN_REQUIRED" -> {
                text(instructions, 4000);
                text(costs, 2000);

                orderCase.setStatus(OrderCase.Status.RETURN_AUTHORISED);
                orderCase.setReturnInstructions(instructions);
                orderCase.setReturnCostAllocation(costs);

                workflow.transitionStatus(
                        order.getId(),
                        OrderStatus.RETURNING,
                        admin.getEmail(),
                        "Return authorised: " + reason
                );
            }

            case "REFUND" -> {
                orderCase.setStatus(OrderCase.Status.REFUND_APPROVED);

                workflow.transitionStatus(
                        order.getId(),
                        OrderStatus.CANCELLED,
                        admin.getEmail(),
                        "Refund approved after case review: " + reason
                );

                // Cancel only the delivery linked to this exact order.
                deliveries.findByOrderId(order.getId())
                        .ifPresent(delivery -> {
                            if (Set.of(
                                    DeliveryStatus.PENDING,
                                    DeliveryStatus.ACCEPTED
                            ).contains(delivery.getStatus())) {
                                delivery.setStatus(DeliveryStatus.CANCELLED);
                                deliveries.save(delivery);
                            }
                        });

                payment.setReleaseDueAt(null);

                money.change(
                        payment,
                        PaymentStatus.REFUND_REQUESTED,
                        admin.getEmail(),
                        "Refund approved; provider execution and reconciliation still required"
                );
            }

            case "REJECT" -> {
                if (orderCase.getStatus() == OrderCase.Status.RETURN_RECEIVED) {
                    throw new IllegalArgumentException(
                            "A received return requires an explicit refund or a documented "
                                    + "support resolution; do not silently restore delivery."
                    );
                }

                orderCase.setStatus(OrderCase.Status.REJECTED);

                workflow.transitionStatus(
                        order.getId(),
                        orderCase.getPreviousOrderStatus(),
                        admin.getEmail(),
                        "Claim rejected: " + reason
                );

                if (orderCase.getPreviousPaymentStatus()
                        == PaymentStatus.RELEASE_REQUESTED) {
                    money.change(
                            payment,
                            PaymentStatus.RELEASE_REQUESTED,
                            admin.getEmail(),
                            "Settlement eligibility restored after review"
                    );
                } else if (orderCase.getPreviousPaymentStatus()
                        == PaymentStatus.HELD
                        && orderCase.getPreviousOrderStatus()
                        == OrderStatus.DELIVERED) {
                    money.scheduleReleaseForOrder(order.getId());
                }
            }

            default -> throw new IllegalArgumentException(
                    "Choose RETURN_REQUIRED, REFUND or REJECT."
            );
        }

        orderCase.setDecision(reason);
        cases.save(orderCase);
        record(orderCase, admin, "Decision " + outcome + ": " + reason);

        return orderCase;
    }

    @Transactional
    public OrderCase returnSent(UUID id, User buyer, String tracking) {
        OrderCase orderCase = lockedCase(id);

        if (!orderCase.getOrder().getBuyer().getId().equals(buyer.getId())) {
            throw new SecurityException(
                    "Only the buyer can submit return tracking."
            );
        }

        if (orderCase.getStatus() != OrderCase.Status.RETURN_AUTHORISED) {
            throw new IllegalArgumentException(
                    "Wait for return authorisation."
            );
        }

        text(tracking, 500);

        orderCase.setTracking(tracking);
        orderCase.setStatus(OrderCase.Status.RETURN_IN_TRANSIT);

        cases.save(orderCase);
        record(orderCase, buyer, "Return dispatched: " + tracking);

        return orderCase;
    }

    @Transactional
    public OrderCase returnReceived(UUID id, User user, String evidence) {
        OrderCase orderCase = lockedCase(id);
        User seller = orderCase.getOrder().getSeller();

        if (user.getRole() != Role.ADMIN
                && (seller == null || !seller.getId().equals(user.getId()))) {
            throw new SecurityException(
                    "Only the seller or support can record return receipt."
            );
        }

        if (orderCase.getStatus() != OrderCase.Status.RETURN_IN_TRANSIT) {
            throw new IllegalArgumentException(
                    "Return is not in transit."
            );
        }

        text(evidence, 4000);

        orderCase.setReceiptEvidence(evidence);
        orderCase.setStatus(OrderCase.Status.RETURN_RECEIVED);

        cases.save(orderCase);

        record(
                orderCase,
                user,
                "Return received; inspection evidence: " + evidence
        );

        return orderCase;
    }

    @Transactional
    public OrderCase appeal(UUID id, User buyer, String reason) {
        OrderCase orderCase = lockedCase(id);

        if (!orderCase.getOrder().getBuyer().getId().equals(buyer.getId())) {
            throw new SecurityException(
                    "Only the buyer can appeal here. "
                            + "Sellers can submit evidence and contact support."
            );
        }

        if (orderCase.getStatus() != OrderCase.Status.REJECTED) {
            throw new IllegalArgumentException(
                    "Only a rejected decision can be appealed."
            );
        }

        text(reason, 4000);
        orderCase.setStatus(OrderCase.Status.APPEALED);

        workflow.transitionStatus(
                orderCase.getOrder().getId(),
                OrderStatus.DISPUTED,
                buyer.getEmail(),
                "Decision appealed: " + reason
        );

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(
                        orderCase.getOrder().getId()
                )
                .orElseThrow();

        payment.setReleaseDueAt(null);

        if (payment.getStatus() == PaymentStatus.RELEASE_REQUESTED) {
            money.change(
                    payment,
                    PaymentStatus.HELD,
                    buyer.getEmail(),
                    "Settlement paused for appeal"
            );
        } else {
            payments.save(payment);
        }

        cases.save(orderCase);
        record(orderCase, buyer, "Appeal: " + reason);

        return orderCase;
    }

    public Optional<OrderCase> forOrder(UUID id, User user) {
        Order order = orders.findById(id).orElseThrow();

        requireOrderParticipant(order, user);

        return cases.findByOrderId(id);
    }

    public List<OrderCase> all(User user) {
        requireAdmin(user);
        return cases.findAll();
    }

    public List<CaseEvent> history(OrderCase orderCase) {
        return events.findByOrderCaseIdOrderByRecordedAtAsc(
                orderCase.getId()
        );
    }

    private Order lockedOrder(UUID id) {
        Order order = orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Order not found."
                ));

        // Preserve auction locking until product-order locking is implemented.
        auctions.findByIdForUpdate(order.getAuctionItem().getId())
                .orElseThrow();

        entityManager.refresh(order);

        return order;
    }

    private OrderCase lockedCase(UUID id) {
        OrderCase orderCase = cases.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Case not found."
                ));

        lockedOrder(orderCase.getOrder().getId());
        entityManager.refresh(orderCase);

        return orderCase;
    }

    public void requireOrderParticipant(Order order, User user) {
        if (user.getRole() == Role.ADMIN) {
            return;
        }

        if (order.getBuyer().getId().equals(user.getId())) {
            return;
        }

        User seller = order.getSeller();

        if (seller != null && seller.getId().equals(user.getId())) {
            return;
        }

        throw new SecurityException(
                "This order belongs to other users."
        );
    }

    private void requireParticipant(OrderCase orderCase, User user) {
        requireOrderParticipant(orderCase.getOrder(), user);
    }

    private void requireAdmin(User user) {
        if (user.getRole() != Role.ADMIN) {
            throw new SecurityException(
                    "Support administrator access is required."
            );
        }
    }

    private void text(String value, int max) {
        if (value == null || value.isBlank() || value.length() > max) {
            throw new IllegalArgumentException(
                    "Provide a non-empty explanation within "
                            + max + " characters."
            );
        }
    }

    private void record(OrderCase orderCase, User user, String detail) {
        events.save(new CaseEvent(
                orderCase,
                user.getEmail(),
                detail.length() > 4000
                        ? detail.substring(0, 4000)
                        : detail
        ));
    }
}