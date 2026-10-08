package com.mambesi.action.delivery;

import com.mambesi.action.delivery.dto.DeliveryRequest;
import com.mambesi.action.delivery.dto.DeliveryResponse;
import com.mambesi.action.security.JwtService;
import com.mambesi.action.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/deliveries")
public class DeliveryController {

    private final DeliveryService deliveryService;
    private final JwtService jwtService;

    public DeliveryController(DeliveryService deliveryService, JwtService jwtService) {
        this.deliveryService = deliveryService;
        this.jwtService = jwtService;
    }

    // Seller creates a delivery request
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PostMapping
    public DeliveryResponse createDelivery(@Valid @RequestBody DeliveryRequest request,
                                           HttpServletRequest httpRequest) {
        String email = extractEmail(httpRequest);
        Delivery delivery = deliveryService.createDelivery(request.getAuctionId(), email, request.preparationEvidence());
        return mapToResponse(delivery);
    }

    public record Reset(boolean pickup, @jakarta.validation.constraints.NotBlank String reason) {}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{deliveryId}/reset-code")
    public DeliveryResponse reset(@PathVariable UUID deliveryId,@Valid @RequestBody Reset request) {
        return mapToResponse(deliveryService.resetCode(deliveryId,request.pickup(),getAuthenticatedEmail(),request.reason()));
    }
    // Driver views all pending deliveries
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/pending")
    public List<DeliveryResponse> getPendingDeliveries() {
        return deliveryService.getPendingDeliveries()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Driver accepts a delivery
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{deliveryId}/accept")
    public DeliveryResponse acceptDelivery(@PathVariable UUID deliveryId,
                                           HttpServletRequest httpRequest) {
        String email = extractEmail(httpRequest);
        Delivery delivery = deliveryService.acceptDelivery(deliveryId, email);
        return mapToResponse(delivery);
    }

    // Driver updates delivery status
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{deliveryId}/status")
    public DeliveryResponse updateStatus(@PathVariable UUID deliveryId,
                                         @RequestParam DeliveryStatus status,
                                         @RequestParam(required=false) String code,
                                         @RequestParam String evidence,
                                         HttpServletRequest httpRequest) {
        String email = extractEmail(httpRequest);
        Delivery delivery = deliveryService.updateStatus(deliveryId, email, status, code, evidence);
        return mapToResponse(delivery);
    }

    // Driver views their deliveries
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-deliveries")
    public List<DeliveryResponse> getMyDeliveries() {
        String email = getAuthenticatedEmail();
        return deliveryService.getMyDeliveries(email)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Buyer tracks their purchases
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-purchases")
    public List<DeliveryResponse> getMyPurchases() {
        String email = getAuthenticatedEmail();
        return deliveryService.getMyPurchases(email)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // Seller views their sales deliveries
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-sales")
    public List<DeliveryResponse> getMySales() {
        String email = getAuthenticatedEmail();
        return deliveryService.getMySales(email)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping
    public List<DeliveryResponse> getAllDeliveries() {
        return deliveryService.getAllDeliveries()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }



    private String extractEmail(HttpServletRequest request) {
        String authHeader = request.getHeader("Authorization");
        return jwtService.extractEmail(authHeader.substring(7));
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return user.getEmail();
    }

    private DeliveryResponse mapToResponse(Delivery delivery) {
        DeliveryResponse response = new DeliveryResponse(
                delivery.getId(),
                delivery.getAuctionItem().getId(),
                delivery.getAuctionItem().getTitle(),
                delivery.getStatus() == DeliveryStatus.PENDING ? null : delivery.getSeller().getEmail(),
                delivery.getStatus() == DeliveryStatus.PENDING ? null : delivery.getBuyer().getEmail(),
                delivery.getDriver() != null ? delivery.getDriver().getEmail() : null,
                delivery.getStatus(),
                delivery.getCreatedAt(),
                delivery.getUpdatedAt()
        );
        String viewer = getAuthenticatedEmail();
        if (viewer.equals(delivery.getSeller().getEmail()) && delivery.getStatus()==DeliveryStatus.ACCEPTED) response.setPickupCode(delivery.getPickupCode());
        if (viewer.equals(delivery.getBuyer().getEmail()) && delivery.getStatus()==DeliveryStatus.IN_TRANSIT) response.setDeliveryCode(delivery.getDeliveryCode());
        return response;
    }
}
