package com.mambesi.action.delivery;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.AuctionRepository;
import com.mambesi.action.payment.PaymentService;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import org.springframework.stereotype.Service;
import com.mambesi.action.payment.Payment;
import com.mambesi.action.payment.PaymentRepository;
import com.mambesi.action.payment.PaymentStatus;

import java.util.List;
import java.util.UUID;

@Service
public class DeliveryService {

    private final DeliveryRepository deliveryRepository;
    private final AuctionRepository auctionRepository;
    private final UserRepository userRepository;

    private final PaymentService paymentService;

    private final PaymentRepository paymentRepository;

    public DeliveryService(DeliveryRepository deliveryRepository,
                           AuctionRepository auctionRepository,
                           UserRepository userRepository,
                           PaymentService paymentService,
                           PaymentRepository paymentRepository) {
        this.deliveryRepository = deliveryRepository;
        this.auctionRepository = auctionRepository;
        this.userRepository = userRepository;
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
    }

    // Seller creates a delivery request after auction closes
    public Delivery createDelivery(UUID auctionId, String sellerEmail) {

        AuctionItem auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        if (auction.isActive()) {
            throw new RuntimeException("Auction is still active. Cannot create delivery yet.");
        }

        if (auction.getWinner() == null) {
            throw new RuntimeException("Auction has no winner. Cannot create delivery.");
        }

        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new RuntimeException("Seller not found"));

        if (!auction.getOwner().getId().equals(seller.getId())) {
            throw new RuntimeException("Only the auction owner can create a delivery.");
        }

        // Check payment is at least HELD before allowing delivery creation
        Payment payment = paymentRepository.findByAuctionItemId(auctionId)
                .orElseThrow(() -> new RuntimeException(
                        "Payment not found. Buyer must complete payment before delivery can be created."
                ));

        if (payment.getStatus() != PaymentStatus.HELD &&
                payment.getStatus() != PaymentStatus.RELEASED) {
            throw new RuntimeException(
                    "Buyer has not completed payment yet. Delivery cannot be created until payment is in escrow."
            );
        }

        Delivery delivery = new Delivery();
        delivery.setAuctionItem(auction);
        delivery.setSeller(seller);
        delivery.setBuyer(auction.getWinner());

        return deliveryRepository.save(delivery);
    }

    // Driver accepts a pending delivery
    public Delivery acceptDelivery(UUID deliveryId, String driverEmail) {

        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));

        if (delivery.getStatus() != DeliveryStatus.PENDING) {
            throw new RuntimeException("Delivery is no longer available.");
        }

        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new RuntimeException("Driver not found"));

        delivery.setDriver(driver);
        delivery.setStatus(DeliveryStatus.ACCEPTED);

        return deliveryRepository.save(delivery);
    }

    // Driver updates delivery status
    public Delivery updateStatus(UUID deliveryId, String driverEmail, DeliveryStatus newStatus) {

        Delivery delivery = deliveryRepository.findById(deliveryId)
                .orElseThrow(() -> new RuntimeException("Delivery not found"));

        if (!delivery.getDriver().getEmail().equals(driverEmail)) {
            throw new RuntimeException("Only the assigned driver can update this delivery.");
        }

        delivery.setStatus(newStatus);
        Delivery saved = deliveryRepository.save(delivery);

        // Schedule auto-release 5 minutes after delivery confirmed
        if (newStatus == DeliveryStatus.DELIVERED) {
            paymentService.scheduleRelease(delivery.getAuctionItem().getId());
        }

        return saved;
    }

    // Get all pending deliveries (for drivers to browse)
    public List<Delivery> getPendingDeliveries() {
        return deliveryRepository.findByStatus(DeliveryStatus.PENDING);
    }

    // Get all deliveries for a driver
    public List<Delivery> getMyDeliveries(String driverEmail) {
        User driver = userRepository.findByEmail(driverEmail)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        return deliveryRepository.findByDriverId(driver.getId());
    }

    // Get delivery status for a buyer
    public List<Delivery> getMyPurchases(String buyerEmail) {
        User buyer = userRepository.findByEmail(buyerEmail)
                .orElseThrow(() -> new RuntimeException("Buyer not found"));
        return deliveryRepository.findByBuyerId(buyer.getId());
    }

    // Get deliveries created by a seller
    public List<Delivery> getMySales(String sellerEmail) {
        User seller = userRepository.findByEmail(sellerEmail)
                .orElseThrow(() -> new RuntimeException("Seller not found"));
        return deliveryRepository.findBySellerId(seller.getId());
    }

    public List<Delivery> getAllDeliveries() {
        return deliveryRepository.findAll();
    }
}