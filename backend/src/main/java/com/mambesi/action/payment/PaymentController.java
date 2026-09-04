package com.mambesi.action.payment;

import com.mambesi.action.payment.dto.PaymentResponse;
import com.mambesi.action.user.User;
import jakarta.servlet.http.HttpServletRequest;
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

    // Buyer initiates payment for won auction
    @PostMapping("/initiate/{auctionId}")
    public ResponseEntity<String> initiatePayment(@PathVariable UUID auctionId) {
        String email = getAuthenticatedEmail();
        String redirectUrl = paymentService.initiatePayment(auctionId, email);
        return ResponseEntity.ok(redirectUrl);
    }

    // PayFast ITN webhook — must be public, no auth
    @PostMapping("/notify")
    public ResponseEntity<String> handleItn(@RequestParam Map<String, String> itnData) {
        paymentService.handleItn(itnData);
        return ResponseEntity.ok("OK");
    }

    @PutMapping("/{auctionId}/cancel")
    public PaymentResponse cancelPayment(@PathVariable UUID auctionId) {
        String email = getAuthenticatedEmail();
        return paymentService.mapToResponse(
                paymentService.cancelPayment(auctionId, email)
        );
    }

    // Buyer views their payments
    @GetMapping("/my-payments")
    public List<PaymentResponse> getMyPayments() {
        String email = getAuthenticatedEmail();
        return paymentService.getPaymentsForBuyer(email)
                .stream()
                .map(paymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    // Seller views their payments
    @GetMapping("/my-earnings")
    public List<PaymentResponse> getMyEarnings() {
        String email = getAuthenticatedEmail();
        return paymentService.getPaymentsForSeller(email)
                .stream()
                .map(paymentService::mapToResponse)
                .collect(Collectors.toList());
    }

    // Admin views all payments
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

    @PostMapping("/notify")
    public ResponseEntity<String> handleItn(
            @RequestParam Map<String, String> itnData,
            @RequestBody(required = false) String body) {

        // Respond immediately so PayFast doesn't timeout
        try {
            // Handle both form params and request body
            if (itnData.isEmpty() && body != null) {
                Map<String, String> parsed = new HashMap<>();
                for (String pair : body.split("&")) {
                    String[] kv = pair.split("=", 2);
                    if (kv.length == 2) {
                        parsed.put(
                                java.net.URLDecoder.decode(kv[0], "UTF-8"),
                                java.net.URLDecoder.decode(kv[1], "UTF-8")
                        );
                    }
                }
                paymentService.handleItn(parsed);
            } else {
                paymentService.handleItn(itnData);
            }
        } catch (Exception e) {
            System.out.println("ITN processing error: " + e.getMessage());
        }

        return ResponseEntity.ok("OK");
    }

    private String getAuthenticatedEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return user.getEmail();
    }
}