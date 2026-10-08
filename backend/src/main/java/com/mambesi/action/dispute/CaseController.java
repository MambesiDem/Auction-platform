package com.mambesi.action.dispute;

import com.mambesi.action.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
@RestController @RequestMapping("/api/cases")
public class CaseController {
    private final CaseService service;
    public CaseController(CaseService s){service=s;}
    public record Open(String reason,String evidence){}
    public record Text(String evidence){}
    public record Decision(String outcome,String reason,String returnInstructions,String returnCostAllocation){}
    public record View(UUID id,UUID orderId,UUID auctionId,String title,String status,String reason,String buyerEvidence,String sellerEvidence,String decision,String returnInstructions,String returnCostAllocation,String tracking,String receiptEvidence,List<CaseEvent> history){}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/order/{id}") public org.springframework.http.ResponseEntity<View> get(@PathVariable UUID id,Authentication a){return service.forOrder(id,user(a)).map(c->org.springframework.http.ResponseEntity.ok(view(c))).orElseGet(()->org.springframework.http.ResponseEntity.noContent().build());}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PostMapping("/order/{id}") public View open(@PathVariable UUID id,@RequestBody Open r,Authentication a){return view(service.open(id,user(a),r.reason(),r.evidence()));}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/evidence") public View evidence(@PathVariable UUID id,@RequestBody Text r,Authentication a){return view(service.respond(id,user(a),r.evidence()));}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/return-sent") public View sent(@PathVariable UUID id,@RequestBody Text r,Authentication a){return view(service.returnSent(id,user(a),r.evidence()));}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/return-received") public View received(@PathVariable UUID id,@RequestBody Text r,Authentication a){return view(service.returnReceived(id,user(a),r.evidence()));}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/{id}/appeal") public View appeal(@PathVariable UUID id,@RequestBody Text r,Authentication a){return view(service.appeal(id,user(a),r.evidence()));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/admin/all") public List<View> all(Authentication a){return service.all(user(a)).stream().map(this::view).toList();}
    @org.springframework.transaction.annotation.Transactional(noRollbackFor=com.mambesi.action.delivery.DeliveryService.InvalidCodeException.class)
    @PutMapping("/admin/{id}/decision") public View decision(@PathVariable UUID id,@RequestBody Decision r,Authentication a){return view(service.decide(id,user(a),r.outcome(),r.reason(),r.returnInstructions(),r.returnCostAllocation()));}
    private User user(Authentication a){return (User)a.getPrincipal();}
    private View view(OrderCase c){return new View(c.getId(),c.getOrder().getId(),c.getOrder().getAuctionItem().getId(),c.getOrder().getListingTitle(),c.getStatus().name(),c.getReason(),c.getBuyerEvidence(),c.getSellerEvidence(),c.getDecision(),c.getReturnInstructions(),c.getReturnCostAllocation(),c.getTracking(),c.getReceiptEvidence(),service.history(c));}
}
