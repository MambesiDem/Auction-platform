package com.mambesi.action.order;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.user.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class OrderService {

    private final OrderRepository orderRepository;

    @Value("${platform.commission:0.08}")
    private double platformCommission;

    public OrderService(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Transactional
    public Order createOrderForAuctionWin(AuctionItem auction, User winner,
                                          int paymentDeadlineMinutes) {
        // Do not create duplicate order if one already exists
        if (orderRepository.findByAuctionItemId(auction.getId()).isPresent()) {
            return orderRepository.findByAuctionItemId(auction.getId()).get();
        }

        Order order = new Order();
        order.setAuctionItem(auction);
        order.setBuyer(winner);
        order.setAgreedPrice(auction.getCurrentPrice());
        // Lock the commission rate at time of order creation
        order.setCommissionRate(platformCommission);
        order.setPaymentDeadline(LocalDateTime.now().plusMinutes(paymentDeadlineMinutes));
        order.setLastActorEmail("system");
        order.setLastReason("Auction closed — winner determined");
        return orderRepository.save(order);
    }

    @Transactional
    public Order transitionStatus(UUID orderId, OrderStatus newStatus,
                                  String actorEmail, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new RuntimeException("Order not found"));

        validateTransition(order.getStatus(), newStatus);

        order.setStatus(newStatus);
        order.setLastActorEmail(actorEmail);
        order.setLastReason(reason);
        return orderRepository.save(order);
    }

    public Order getByAuctionId(UUID auctionId) {
        return orderRepository.findByAuctionItemId(auctionId)
                .orElseThrow(() -> new RuntimeException("Order not found for this auction"));
    }

    public List<Order> getOrdersForBuyer(UUID buyerId) {
        return orderRepository.findByBuyerId(buyerId);
    }

    public List<Order> getOrdersForSeller(String sellerEmail) {
        return orderRepository.findByAuctionItemOwnerEmail(sellerEmail);
    }

    private void validateTransition(OrderStatus current, OrderStatus next) {
        boolean valid = switch (current) {
            case AWAITING_PAYMENT -> next == OrderStatus.PREPARATION
                    || next == OrderStatus.CANCELLED;
            case PREPARATION      -> next == OrderStatus.COLLECTION_PENDING
                    || next == OrderStatus.CANCELLED;
            case COLLECTION_PENDING -> next == OrderStatus.IN_TRANSIT
                    || next == OrderStatus.CANCELLED;
            case IN_TRANSIT       -> next == OrderStatus.DELIVERED
                    || next == OrderStatus.RETURNING;
            case DELIVERED        -> next == OrderStatus.COMPLETED
                    || next == OrderStatus.DISPUTED;
            case DISPUTED         -> next == OrderStatus.COMPLETED
                    || next == OrderStatus.RETURNING;
            case RETURNING        -> next == OrderStatus.COMPLETED
                    || next == OrderStatus.CANCELLED;
            default               -> false;
        };

        if (!valid) {
            throw new RuntimeException(
                    "Invalid order transition: " + current + " → " + next
            );
        }
    }
}