package com.mambesi.action.delivery;

import com.mambesi.action.auction.*;
import com.mambesi.action.order.*;
import com.mambesi.action.payment.*;
import com.mambesi.action.user.*;
import com.mambesi.action.common.*;
import com.mambesi.action.notification.EmailService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

@Service
public class DeliveryService {

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager entityManager;

    @org.springframework.beans.factory.annotation.Autowired
    private OrderEventRepository audit;

    private final DeliveryRepository deliveries;
    private final AuctionRepository auctions;
    private final UserRepository users;
    private final PaymentRepository payments;
    private final OrderService orders;
    private final PaymentService settlement;
    private final EmailService email;

    private final java.security.SecureRandom random =
            new java.security.SecureRandom();

    public DeliveryService(
            DeliveryRepository d,
            AuctionRepository a,
            UserRepository u,
            PaymentRepository p,
            OrderService o,
            PaymentService s,
            EmailService e
    ) {
        deliveries = d;
        auctions = a;
        users = u;
        payments = p;
        orders = o;
        settlement = s;
        email = e;
    }

    @Transactional
    public Delivery createDelivery(UUID id, String seller, String evidence) {
        AuctionItem auction = lock(id);

        if (!auction.getOwner().getEmail().equals(seller)) {
            throw new SecurityException(
                    "Only the seller can book collection."
            );
        }

        Order order = orders.getByAuctionId(id);

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "Buyer payment is required before collection."
                ));

        if (auction.isActive()
                || payment.getStatus() != PaymentStatus.HELD
                || !Set.of(
                OrderStatus.PREPARATION,
                OrderStatus.COLLECTION_PENDING
        ).contains(order.getStatus())) {
            throw new IllegalArgumentException(
                    "This order is not ready for collection."
            );
        }

        checkEvidence(evidence);

        Optional<Delivery> existing = deliveries.findByAuctionItemId(id);

        if (existing.isPresent()) {
            return existing.get();
        }

        Delivery delivery = new Delivery();
        delivery.setOrder(order);
        delivery.setAuctionItem(auction);
        delivery.setBuyer(order.getBuyer());
        delivery.setSeller(auction.getOwner());
        delivery.setPreparationEvidence(evidence);
        delivery.setPickupCode(code());
        delivery.setDeliveryCode(code());
        delivery.setStatus(DeliveryStatus.PENDING);

        deliveries.save(delivery);

        orders.transitionStatus(
                order.getId(),
                OrderStatus.COLLECTION_PENDING,
                seller,
                "Seller confirmed listed item and preparation evidence; collection offered"
        );

        return delivery;
    }

    @Transactional
    public Delivery acceptDelivery(UUID id, String driver) {
        Delivery delivery = lockedDelivery(id);

        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new IllegalArgumentException(
                    "This job has already been accepted or cancelled."
            );
        }

        requirePaid(delivery);

        User user = users.findByEmail(driver).orElseThrow();

        if (user.getRole() != Role.DRIVER || user.isBanned()) {
            throw new SecurityException(
                    "An active driver account is required."
            );
        }

        delivery.setDriver(user);
        delivery.setStatus(DeliveryStatus.ACCEPTED);
        deliveries.save(delivery);

        AfterCommit.run(() -> email.sendDeliveryStatusEmail(
                delivery.getBuyer().getEmail(),
                delivery.getAuctionItem().getTitle(),
                "ACCEPTED"
        ));

        return delivery;
    }

    public static class InvalidCodeException extends IllegalArgumentException {

        public InvalidCodeException(String text) {
            super(text);
        }
    }

    @Transactional(noRollbackFor = InvalidCodeException.class)
    public Delivery updateStatus(
            UUID id,
            String driver,
            DeliveryStatus next,
            String suppliedCode,
            String evidence
    ) {
        Delivery delivery = lockedDelivery(id);

        if (delivery.getDriver() == null
                || !delivery.getDriver().getEmail().equals(driver)) {
            throw new SecurityException(
                    "Only the assigned driver can update this job."
            );
        }

        requirePaid(delivery);

        if (delivery.getStatus() == next) {
            return delivery;
        }

        boolean allowed = switch (delivery.getStatus()) {
            case ACCEPTED -> next == DeliveryStatus.PICKED_UP;
            case PICKED_UP -> next == DeliveryStatus.IN_TRANSIT;
            case IN_TRANSIT -> next == DeliveryStatus.DELIVERED;
            default -> false;
        };

        if (!allowed) {
            throw new IllegalArgumentException(
                    "Complete each delivery stage in order. "
                            + "Cancelled or completed jobs cannot move backwards."
            );
        }

        checkEvidence(evidence);

        if (next == DeliveryStatus.PICKED_UP) {
            validateCode(delivery, true, suppliedCode);
            delivery.setPickupEvidence(evidence);
        }

        if (next == DeliveryStatus.DELIVERED) {
            validateCode(delivery, false, suppliedCode);
            delivery.setDeliveryEvidence(evidence);
            delivery.setDeliveryConfirmed(true);
        }

        delivery.setStatus(next);
        deliveries.save(delivery);

        // Update the exact order linked when this delivery was created.
        Order order = requireDeliveryOrder(delivery);

        if (next == DeliveryStatus.PICKED_UP) {
            orders.transitionStatus(
                    order.getId(),
                    OrderStatus.IN_TRANSIT,
                    driver,
                    "Pickup confirmed with seller handover code and evidence"
            );
        }

        if (next == DeliveryStatus.DELIVERED) {
            orders.transitionStatus(
                    order.getId(),
                    OrderStatus.DELIVERED,
                    driver,
                    "Buyer handover code verified; delivery evidence recorded"
            );

            // Settlement remains auction-based during this migration step.
            settlement.scheduleRelease(delivery.getAuctionItem().getId());
        }

        AfterCommit.run(() -> email.sendDeliveryStatusEmail(
                delivery.getBuyer().getEmail(),
                delivery.getAuctionItem().getTitle(),
                next.name()
        ));

        return delivery;
    }

    private void validateCode(
            Delivery delivery,
            boolean pickup,
            String value
    ) {
        int attempts = pickup
                ? delivery.getPickupCodeAttempts()
                : delivery.getDeliveryCodeAttempts();

        if (attempts >= 5) {
            throw new InvalidCodeException(
                    "Handover code is locked. "
                            + "Contact support; do not hand over the item."
            );
        }

        String expected = pickup
                ? delivery.getPickupCode()
                : delivery.getDeliveryCode();

        if (expected == null
                || value == null
                || !java.security.MessageDigest.isEqual(
                expected.getBytes(
                        java.nio.charset.StandardCharsets.UTF_8
                ),
                value.trim().getBytes(
                        java.nio.charset.StandardCharsets.UTF_8
                )
        )) {

            if (pickup) {
                delivery.setPickupCodeAttempts(attempts + 1);
            } else {
                delivery.setDeliveryCodeAttempts(attempts + 1);
            }

            deliveries.save(delivery);

            throw new InvalidCodeException(
                    "Incorrect handover code. "
                            + (4 - attempts)
                            + " attempt(s) remain before support review."
            );
        }
    }

    @Transactional
    public Delivery resetCode(
            UUID id,
            boolean pickup,
            String admin,
            String reason
    ) {
        if (reason == null || reason.isBlank()) {
            throw new IllegalArgumentException(
                    "Support reason is required."
            );
        }

        Delivery delivery = lockedDelivery(id);

        if (delivery.getStatus() == DeliveryStatus.CANCELLED
                || delivery.getStatus() == DeliveryStatus.DELIVERED) {
            throw new IllegalArgumentException("This job is closed.");
        }

        if (pickup) {
            if (delivery.getStatus() != DeliveryStatus.ACCEPTED) {
                throw new IllegalArgumentException(
                        "Pickup reset requires an accepted job."
                );
            }

            delivery.setPickupCode(code());
            delivery.setPickupCodeAttempts(0);
        } else {
            if (delivery.getStatus() != DeliveryStatus.IN_TRANSIT) {
                throw new IllegalArgumentException(
                        "Delivery reset requires an in-transit job."
                );
            }

            delivery.setDeliveryCode(code());
            delivery.setDeliveryCodeAttempts(0);
        }

        deliveries.save(delivery);

        Order order = requireDeliveryOrder(delivery);

        // A code reset is recorded even though the order status is unchanged.
        audit.save(new OrderEvent(
                order,
                order.getStatus(),
                order.getStatus(),
                admin,
                "Handover code reset: " + reason
        ));

        return delivery;
    }

    private Order requireDeliveryOrder(Delivery delivery) {
        Order order = delivery.getOrder();

        if (order == null) {
            throw new IllegalStateException(
                    "This delivery is missing its order reference. Contact support."
            );
        }

        return order;
    }

    private void requirePaid(Delivery delivery) {
        Order order = requireDeliveryOrder(delivery);

        Payment payment = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId())
                .orElseThrow(() -> new IllegalArgumentException(
                        "No payment was found for this delivery's order."
                ));

        if (payment.getStatus() != PaymentStatus.HELD
                || Set.of(
                OrderStatus.CANCELLED,
                OrderStatus.DISPUTED,
                OrderStatus.RETURNING
        ).contains(order.getStatus())) {
            throw new IllegalArgumentException(
                    "This delivery is paused or cancelled. Contact support."
            );
        }
    }

    public List<Delivery> getPendingDeliveries() {
        return deliveries.findByStatus(DeliveryStatus.PENDING);
    }

    public List<Delivery> getMyDeliveries(String email) {
        return deliveries.findByDriverId(user(email).getId());
    }

    public List<Delivery> getMyPurchases(String email) {
        return deliveries.findByBuyerId(user(email).getId());
    }

    public List<Delivery> getMySales(String email) {
        return deliveries.findBySellerId(user(email).getId());
    }

    public List<Delivery> getAllDeliveries() {
        return deliveries.findAll();
    }

    private User user(String email) {
        return users.findByEmail(email).orElseThrow();
    }

    private AuctionItem lock(UUID id) {
        return auctions.findByIdForUpdate(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Auction not found."
                ));
    }

    private Delivery lockedDelivery(UUID id) {
        Delivery delivery = deliveries.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Delivery not found."
                ));

        lock(delivery.getAuctionItem().getId());
        entityManager.refresh(delivery);

        return delivery;
    }

    private String code() {
        return String.format(
                java.util.Locale.ROOT,
                "%06d",
                random.nextInt(1000000)
        );
    }

    private void checkEvidence(String text) {
        if (text == null || text.isBlank() || text.length() > 2000) {
            throw new IllegalArgumentException(
                    "Record condition/packaging evidence or a photo reference "
                            + "(up to 2000 characters)."
            );
        }
    }
}