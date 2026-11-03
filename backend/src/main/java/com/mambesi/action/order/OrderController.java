package com.mambesi.action.order;

import com.mambesi.action.dispute.CaseService;
import com.mambesi.action.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/orders")
public class OrderController {

    private final OrderRepository orders;
    private final OrderEventRepository events;
    private final CaseService access;

    public OrderController(
            OrderRepository orders,
            OrderEventRepository events,
            CaseService access
    ) {
        this.orders = orders;
        this.events = events;
        this.access = access;
    }

    public record View(
            UUID id,
            UUID auctionId,
            String title,
            String description,
            String buyerEmail,
            String sellerEmail,
            String status,
            double agreedPrice,
            double commissionRate,
            LocalDateTime paymentDeadline,
            UUID productListingId,
            String saleFormat,
            Integer quantity,
            BigDecimal unitPrice
    ) {}

    @Transactional(readOnly = true)
    @GetMapping("/mine")
    public List<View> mine(Authentication authentication) {
        User user = (User) authentication.getPrincipal();

        List<Order> result = switch (user.getRole()) {
            case BUYER -> orders.findByBuyerId(user.getId());
            case SELLER -> orders.findBySellerEmailOrderByCreatedAtDesc(
                    user.getEmail()
            );
            case ADMIN -> orders.findAll();
            default -> throw new SecurityException(
                    "Buyer or seller access is required."
            );
        };

        return result.stream()
                .map(this::view)
                .toList();
    }

    @Transactional(readOnly = true)
    @GetMapping("/{id}/history")
    public List<OrderEvent> history(
            @PathVariable UUID id,
            Authentication authentication
    ) {
        Order order = orders.findById(id)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Order not found."
                ));

        access.requireOrderParticipant(
                order,
                (User) authentication.getPrincipal()
        );

        return events.findByOrderIdOrderByRecordedAtAsc(id);
    }

    private View view(Order order) {
        var auction = order.getAuctionItem();
        var product = order.getProductListing();

        // An order must identify exactly one source listing.
        if ((auction == null) == (product == null)) {
            throw new IllegalStateException(
                    "Order listing reference requires support review."
            );
        }

        User seller = order.getSeller();

        if (seller == null) {
            throw new IllegalStateException(
                    "Order seller reference requires support review."
            );
        }

        return new View(
                order.getId(),
                auction != null ? auction.getId() : null,
                order.getListingTitle(),
                order.getListingDescription(),
                order.getBuyer().getEmail(),
                seller.getEmail(),
                order.getStatus().name(),
                order.getAgreedPrice(),
                order.getCommissionRate(),
                order.getPaymentDeadline(),
                product != null ? product.getId() : null,
                auction != null ? "AUCTION" : "BUY_NOW",
                order.getQuantity(),
                order.getUnitPrice()
        );
    }
}