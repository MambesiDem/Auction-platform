package com.mambesi.action.order;

import com.mambesi.action.dispute.CaseService;
import com.mambesi.action.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController @RequestMapping("/api/orders")
public class OrderController {
    private final OrderRepository orders;private final OrderEventRepository events;private final CaseService access;
    public OrderController(OrderRepository o, OrderEventRepository e, CaseService c){orders=o;events=e;access=c;}
    public record View(UUID id,UUID auctionId,String title,String description,String buyerEmail,String sellerEmail,String status,double agreedPrice,double commissionRate,java.time.LocalDateTime paymentDeadline){}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/mine") public List<View> mine(Authentication a){User u=(User)a.getPrincipal();List<Order> list=switch(u.getRole()){case BUYER->orders.findByBuyerId(u.getId());case SELLER->orders.findByAuctionItemOwnerEmail(u.getEmail());case ADMIN->orders.findAll();default->throw new SecurityException("Buyer or seller access is required.");};return list.stream().map(this::view).toList();}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/{id}/history") public List<OrderEvent> history(@PathVariable UUID id,Authentication a){Order o=orders.findById(id).orElseThrow();access.requireOrderParticipant(o,(User)a.getPrincipal());return events.findByOrderIdOrderByRecordedAtAsc(id);}
    private View view(Order o){return new View(o.getId(),o.getAuctionItem().getId(),o.getListingTitle(),o.getListingDescription(),o.getBuyer().getEmail(),o.getAuctionItem().getOwner().getEmail(),o.getStatus().name(),o.getAgreedPrice(),o.getCommissionRate(),o.getPaymentDeadline());}
}
