package com.mambesi.action.order;

import com.mambesi.action.common.AfterCommit;
import com.mambesi.action.common.AppTime;
import com.mambesi.action.listing.ProductListing;
import com.mambesi.action.listing.ProductListingRepository;
import com.mambesi.action.notification.EmailService;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentStatus;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.PersistenceContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class BuyNowReservationService {

    // Payment states where money may have moved. Such an order must not be expired here.
    private static final List<PaymentStatus> MONEY_STATES = List.of(
            PaymentStatus.HELD,
            PaymentStatus.REVIEW_REQUIRED,
            PaymentStatus.REFUND_REQUESTED,
            PaymentStatus.RELEASE_REQUESTED,
            PaymentStatus.RELEASED
    );

    @PersistenceContext
    private EntityManager entityManager;

    private final PaymentRepository payments;
    private final ProductListingRepository listings;
    private final OrderService orders;
    private final EmailService email;

    @Value("${buynow.payment-grace-minutes:5}")
    private int graceMinutes;

    public BuyNowReservationService(PaymentRepository payments,
                                    ProductListingRepository listings,
                                    OrderService orders,
                                    EmailService email) {
        this.payments = payments;
        this.listings = listings;
        this.orders = orders;
        this.email = email;
    }

    /**
     * Cancels an unpaid Buy Now order after its payment window and gives the
     * reserved stock back. Safe to call repeatedly.
     */
    @Transactional
    public void expireIfUnpaid(UUID orderId) {
        // The order row is the shared lock for Buy Now payments, deliveries and expiry.
        Order order = entityManager.find(
                Order.class, orderId, LockModeType.PESSIMISTIC_WRITE);

        if (order == null) {
            return;
        }

        entityManager.refresh(order);

        if (order.getAuctionItem() != null
                || order.getProductListing() == null
                || order.getStatus() != OrderStatus.AWAITING_PAYMENT
                || order.getPaymentDeadline() == null
                || AppTime.now().isBefore(order.getPaymentDeadline())) {
            return;
        }

        // Money may have moved. Leave it to the payment flow and support.
        if (payments.existsByOrderIdAndStatusIn(order.getId(), MONEY_STATES)) {
            return;
        }

        // A checkout that was opened but never confirmed gets a short grace period,
        // so a slow PayFast confirmation can still be applied normally.
        Optional<Payment> latest = payments
                .findFirstByOrderIdOrderByCreatedAtDescIdDesc(order.getId());
        LocalDateTime graceEnds =
                order.getPaymentDeadline().plusMinutes(graceMinutes);

        if (latest.isPresent()
                && latest.get().getStatus() == PaymentStatus.PENDING
                && AppTime.now().isBefore(graceEnds)) {
            return;
        }

        ProductListing listing = listings
                .findByIdForUpdate(order.getProductListing().getId())
                .orElseThrow(() -> new IllegalStateException(
                        "Listing not found for an expired order."));

        listing.setStockQuantity(listing.getStockQuantity() + order.getQuantity());
        listings.save(listing);

        orders.transitionStatus(
                order.getId(),
                OrderStatus.CANCELLED,
                "system",
                "Payment window expired. Reserved stock released."
        );

        String buyerEmail = order.getBuyer().getEmail();
        String title = order.getListingTitle();

        AfterCommit.run(() -> email.sendEmail(
                buyerEmail,
                "Your reservation expired: " + title,
                "Your order for \"" + title + "\" was not paid in time, so the items "
                        + "have been released. You can place a new order at any time "
                        + "while stock is available."
        ));
    }
}