package com.mambesi.action.payment;
import com.mambesi.action.payment.dto.PaymentResponse;
import com.mambesi.action.user.User;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.*;
@RestController @RequestMapping("/api/payments")
public class PaymentController {
    private final PaymentService service;
    public PaymentController(PaymentService s){service=s;}
    @PostMapping("/initiate/{id}") public ResponseEntity<String> initiate(@PathVariable UUID id,Authentication auth){return ResponseEntity.ok(service.initiatePayment(id,user(auth).getEmail()));}
    @PostMapping(value="/notify",consumes=MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<String> notify(@RequestBody String raw,HttpServletRequest request){
        var validated=service.validateNotification(raw,request.getRemoteAddr(),request.getHeader("X-Forwarded-For"));service.applyNotification(validated);return ResponseEntity.ok("OK");
    }
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/cancel") public PaymentResponse cancel(@PathVariable UUID id,Authentication auth){return service.mapToResponse(service.cancelPayment(id,user(auth).getEmail()));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-payments") public List<PaymentResponse> mine(Authentication a){return service.getPaymentsForBuyer(user(a).getEmail()).stream().map(service::mapToResponse).toList();}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-earnings") public List<PaymentResponse> earnings(Authentication a){return service.getPaymentsForSeller(user(a).getEmail()).stream().map(service::mapToResponse).toList();}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping public List<PaymentResponse> all(){return service.getAllPayments().stream().map(service::mapToResponse).toList();}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/status/{id}") public PaymentResponse status(@PathVariable UUID id,Authentication a){return service.mapToResponse(service.getPaymentByAuctionId(id,user(a).getEmail()));}
    public record Confirmation(@NotBlank @Size(max=300)String reference){}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/confirm-payout") public PaymentResponse payout(@PathVariable UUID id,@Valid @RequestBody Confirmation r,Authentication a){return service.mapToResponse(service.recordSettlement(id,false,r.reference(),user(a).getEmail()));}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/confirm-refund") public PaymentResponse refund(@PathVariable UUID id,@Valid @RequestBody Confirmation r,Authentication a){return service.mapToResponse(service.recordSettlement(id,true,r.reference(),user(a).getEmail()));}
    public record Reconciliation(@NotBlank String action,@NotBlank @Size(max=300)String reference,@NotBlank @Size(max=2000)String reason){}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/reconcile") public PaymentResponse reconcile(@PathVariable UUID id,@Valid @RequestBody Reconciliation r,Authentication a){return service.mapToResponse(service.reconcileAttempt(id,r.action(),r.reference(),r.reason(),user(a).getEmail()));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/health") public Map<String,String> health(){return Map.of("status","ok");}
    private User user(Authentication a){return (User)a.getPrincipal();}
}
