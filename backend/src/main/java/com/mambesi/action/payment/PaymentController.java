package com.mambesi.action.payment;

import com.mambesi.action.payment.dto.PaymentResponse;
import com.mambesi.action.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/initiate/{auctionId}")
    public ResponseEntity<String> initiatePayment(@PathVariable UUID auctionId) {
        String email = getAuthenticatedEmail();
        String redirectUrl = paymentService.initiatePayment(auctionId, email);
        return ResponseEntity.ok(redirectUrl);
    }

    // Single unified ITN handler — handles both form params and raw body
    @PostMapping("/notify")
    public ResponseEntity<String> handleItn(
            @RequestParam(required = false) Map<String, String> itnData,
            @RequestBody(required = false) String body) {
        try {
            Map<String, String> data = new HashMap<>();

            if (itnData != null && !itnData.isEmpty()) {
                data = itnData;
            } else if (body != null && !body.isEmpty()) {
                for (String pair : body.split("&")) {
                    String[] kv = pair.split("=", 2);
                    if (kv.length == 2) {
                        data.put(
                                java.net.URLDecoder.decode(kv[0], "UTF-8"),
                                java.net.URLDecoder.decode(kv[1], "UTF-8")
                        );
                    }
                }
            }

            System.out.println("ITN RECEIVED: " + data);
            paymentService.handleItn(data);

        } catch (Exception e) {
            System.out.println("ITN ERROR: " + e.getMessage());
        }

        return ResponseEntity.ok("OK");
    }

    @PutMapping("/{auctionId}/cancel")
    public PaymentResponse cancelPayment(@PathVariable UUID auctionId) {
        String email = getAuthenticatedEmail();
        return paymentService.mapToResponse(
                paymentService.cancelPayment(auctionId, email)
        );
    }

    @GetMapping("/my-payments")
    public List<PaymentResponse> getMyPayments() {
        String email = getAuthenticatedEmail();
        return paymentService.getPaymentsForBuyer(email)
                .stream()
                .map(paymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/my-earnings")
    public List<PaymentResponse> getMyEarnings() {
        String email = getAuthenticatedEmail();
        return paymentService.getPaymentsForSeller(email)
                .stream()
                .map(paymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping
    public List<PaymentResponse> getAllPayments() {
        return paymentService.getAllPayments()
                .stream()
                .map(paymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/status/{auctionId}")
    public PaymentResponse getPaymentStatus(@PathVariable UUID auctionId) {
        Payment payment = paymentService.getPaymentByAuctionId(auctionId);
        return paymentService.mapToResponse(payment);
    }

    @GetMapping("/health")
    public ResponseEntity<String> health() {
        return ResponseEntity.ok("OK");
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return user.getEmail();
    }
}