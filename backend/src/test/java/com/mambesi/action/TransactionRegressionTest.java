package com.mambesi.action;

import com.mambesi.action.auction.*;
import com.mambesi.action.bid.BidService;
import com.mambesi.action.common.AppTime;
import com.mambesi.action.delivery.Delivery;
import com.mambesi.action.delivery.DeliveryRepository;
import com.mambesi.action.delivery.DeliveryService;
import com.mambesi.action.delivery.DeliveryStatus;
import com.mambesi.action.dispute.CaseService;
import com.mambesi.action.dispute.OrderCase;
import com.mambesi.action.order.Order;
import com.mambesi.action.order.OrderRepository;
import com.mambesi.action.order.OrderStatus;
import com.mambesi.action.payment.*;
import com.mambesi.action.user.Role;
import com.mambesi.action.user.User;
import com.mambesi.action.user.UserRepository;
import com.mambesi.action.user.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.concurrent.TimeUnit;

@SpringBootTest(properties={
 "spring.datasource.url=jdbc:h2:mem:connsb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
 "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.hibernate.ddl-auto=create-drop",
 "spring.jpa.open-in-view=false","jwt.secret=0123456789012345678901234567890123456789","jwt.expiration=86400000",
 "payfast.merchant-id=10000100","payfast.merchant-key=test-key","payfast.passphrase=test-passphrase","payfast.sandbox=true",
 "payfast.return-url=http://localhost:3000/payment/success","payfast.cancel-url=http://localhost:3000/payment/cancel","payfast.notify-url=http://localhost/notify",
 "platform.commission=0.08","spring.task.scheduling.pool.size=1"
})
class TransactionRegressionTest {
 @Autowired AuctionRepository auctions;@Autowired AuctionService auctionService;@Autowired BidService bidService;
 @Autowired UserRepository users;@Autowired UserService userService;@Autowired OrderRepository orders;
 @Autowired PaymentRepository payments;@Autowired PaymentService paymentService;@Autowired DeliveryService deliveryService;@Autowired DeliveryRepository deliveries;
 @Autowired RunnerUpOfferRepository offers;@Autowired CaseService cases;@Autowired AuctionResponseMapper mapper;
 @Autowired WebApplicationContext web;@Autowired com.mambesi.action.security.JwtService tokens;
 @MockitoBean PayfastClient provider;
 User seller,a,b,c,driver,driver2,admin; MockMvc mvc;
 @BeforeEach void setup(){
  reset(provider);when(provider.isSandbox()).thenReturn(true);when(provider.checkout(any())).thenReturn("https://sandbox.payfast.co.za/eng/process?test=true");
  seller=user(Role.SELLER);a=user(Role.BUYER);b=user(Role.BUYER);c=user(Role.BUYER);driver=user(Role.DRIVER);driver2=user(Role.DRIVER);admin=user(Role.ADMIN);
  mvc=MockMvcBuilders.webAppContextSetup(web).apply(springSecurity()).build();
 }
 User user(Role role){User u=new User();u.setFullName("Test "+role);u.setEmail(UUID.randomUUID()+"@example.test");u.setPassword("test-hash");u.setRole(role);return users.save(u);}
 AuctionItem auction(Double reserve){AuctionItem x=new AuctionItem();x.setOwner(seller);x.setTitle("Test item");x.setDescription("Used item; intact screen, charger included");x.setStartingPrice(100);x.setReservePrice(reserve);x.setStartTime(AppTime.now().minusMinutes(1));x.setEndTime(AppTime.now().plusHours(2));x.setCommissionRate(0.08);return auctions.save(x);}
 Order close(AuctionItem x){auctionService.closeAuction(x.getId());return orders.findByAuctionItemId(x.getId()).orElseThrow();}
 Payment pay(AuctionItem x,User buyer){paymentService.initiatePayment(x.getId(),buyer.getEmail());Payment p=payments.findByAuctionItemId(x.getId()).orElseThrow();paymentService.applyNotification(new PaymentService.ValidatedNotification(p.getId(),UUID.randomUUID().toString(),"COMPLETE"));return payments.findById(p.getId()).orElseThrow();}
 void expire(Order o){o.setPaymentDeadline(AppTime.now().minusMinutes(1));orders.save(o);}
 @Test void firstBidThenIncrementAndLeaderBlock(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());assertThrows(IllegalArgumentException.class,()->bidService.placeBid(x.getId(),100,b.getEmail()));bidService.placeBid(x.getId(),105,b.getEmail());assertThrows(IllegalArgumentException.class,()->bidService.placeBid(x.getId(),110,b.getEmail()));assertEquals(105,auctions.findById(x.getId()).orElseThrow().getCurrentPrice());}
 @Test void selfBiddingAndFractionalCentsRejected(){AuctionItem x=auction(null);assertThrows(IllegalArgumentException.class,()->bidService.placeBid(x.getId(),100,seller.getEmail()));assertThrows(IllegalArgumentException.class,()->bidService.placeBid(x.getId(),100.001,a.getEmail()));}
 @Test void nullableReserveClosesAndMaps(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);var dto=mapper.map(List.of(auctions.findById(x.getId()).orElseThrow()),a).getFirst();assertTrue(dto.isReserveMet());assertTrue(dto.isCanPay());assertEquals(105,dto.getNextMinimumBid());}
 @Test void unmetReserveHasNoWinner(){AuctionItem x=auction(200.0);bidService.placeBid(x.getId(),100,a.getEmail());auctionService.closeAuction(x.getId());assertNull(auctions.findById(x.getId()).orElseThrow().getWinner());assertTrue(orders.findByAuctionItemId(x.getId()).isEmpty());}
 @Test void acceptedBidResetsOnlyThreeMinutes(){AuctionItem x=auction(null);x.setEndTime(AppTime.now().plusMinutes(1));auctions.save(x);bidService.placeBid(x.getId(),100,a.getEmail());var end=auctions.findById(x.getId()).orElseThrow().getEndTime();assertTrue(end.isAfter(AppTime.now().plusMinutes(2)));assertTrue(end.isBefore(AppTime.now().plusMinutes(3).plusSeconds(2)));assertThrows(IllegalArgumentException.class,()->bidService.placeBid(x.getId(),99,b.getEmail()));assertEquals(end,auctions.findById(x.getId()).orElseThrow().getEndTime());}
 @Test void relistingPreservesOldBidsAndCreatesNewIdentity(){AuctionItem x=auction(200.0);bidService.placeBid(x.getId(),100,a.getEmail());auctionService.closeAuction(x.getId());AuctionItem fresh=auctionService.reopenAuction(x.getId(),seller.getEmail());assertNotEquals(x.getId(),fresh.getId());assertTrue(fresh.isActive());assertFalse(auctions.findById(x.getId()).orElseThrow().isActive());assertFalse(orders.findByAuctionItemId(fresh.getId()).isPresent());}
 @Test void pendingRetryResumesAndFailedRetryCreatesSeparateAttempt(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);paymentService.initiatePayment(x.getId(),a.getEmail());Payment first=payments.findByAuctionItemId(x.getId()).orElseThrow();paymentService.initiatePayment(x.getId(),a.getEmail());assertEquals(first.getId(),payments.findByAuctionItemId(x.getId()).orElseThrow().getId());paymentService.applyNotification(new PaymentService.ValidatedNotification(first.getId(),UUID.randomUUID().toString(),"FAILED"));paymentService.initiatePayment(x.getId(),a.getEmail());assertNotEquals(first.getId(),payments.findFirstByOrderIdOrderByCreatedAtDescIdDesc(o.getId()).orElseThrow().getId());assertEquals(PaymentStatus.FAILED,payments.findById(first.getId()).orElseThrow().getStatus());}
 @Test void paymentUsesOrderSnapshot(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);AuctionItem changed=auctions.findById(x.getId()).orElseThrow();changed.setCurrentPrice(500);changed.setCommissionRate(0.20);auctions.save(changed);paymentService.initiatePayment(x.getId(),a.getEmail());Payment p=payments.findByAuctionItemId(x.getId()).orElseThrow();assertEquals(o.getAgreedPrice(),p.getTotalAmount());assertEquals(8,p.getCommissionAmount());}
 @Test void pendingPaymentStopsRunnerUpAndExpiredInitiation(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,b.getEmail());bidService.placeBid(x.getId(),105,a.getEmail());Order o=close(x);paymentService.initiatePayment(x.getId(),a.getEmail());expire(o);auctionService.expirePaymentAndReassign(x.getId());assertEquals(OrderStatus.AWAITING_PAYMENT,orders.findById(o.getId()).orElseThrow().getStatus());assertFalse(offers.existsByAuctionIdAndStatus(x.getId(),RunnerUpOffer.Status.OFFERED));assertThrows(IllegalArgumentException.class,()->paymentService.initiatePayment(x.getId(),a.getEmail()));}
 @Test void runnerUpRequiresAcceptanceAndCannotCycleBack(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,c.getEmail());bidService.placeBid(x.getId(),105,b.getEmail());bidService.placeBid(x.getId(),110,a.getEmail());Order first=close(x);expire(first);auctionService.expirePaymentAndReassign(x.getId());RunnerUpOffer second=auctionService.getOffers(b.getEmail()).getFirst();assertEquals(a.getId(),auctions.findById(x.getId()).orElseThrow().getWinner().getId());auctionService.respondToOffer(second.getId(),b.getEmail(),true);Order next=orders.findByAuctionItemId(x.getId()).orElseThrow();assertNotEquals(first.getId(),next.getId());assertEquals(b.getId(),next.getBuyer().getId());assertEquals(105,next.getAgreedPrice());expire(next);auctionService.expirePaymentAndReassign(x.getId());assertEquals(c.getId(),auctionService.getOffers(c.getEmail()).getFirst().getBuyer().getId());assertTrue(auctionService.getOffers(a.getEmail()).isEmpty());}
 @Test void runnerUpBelowReserveIsNotOffered(){AuctionItem x=auction(105.0);bidService.placeBid(x.getId(),100,b.getEmail());bidService.placeBid(x.getId(),105,a.getEmail());Order o=close(x);expire(o);auctionService.expirePaymentAndReassign(x.getId());assertTrue(auctionService.getOffers(b.getEmail()).isEmpty());}
 @Test void normalDeliveryKeepsOrderSyncedAndRequiresCodes(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);pay(x,a);Delivery d=deliveryService.createDelivery(x.getId(),seller.getEmail(),"Screen intact, sealed box; photo stored");assertEquals(OrderStatus.COLLECTION_PENDING,orders.findById(o.getId()).orElseThrow().getStatus());deliveryService.acceptDelivery(d.getId(),driver.getEmail());assertThrows(IllegalArgumentException.class,()->deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.DELIVERED,d.getDeliveryCode(),"handover"));deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.PICKED_UP,d.getPickupCode(),"sealed box collected");deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.IN_TRANSIT,null,"departed");deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.DELIVERED,d.getDeliveryCode(),"buyer received sealed parcel");assertEquals(OrderStatus.DELIVERED,orders.findById(o.getId()).orElseThrow().getStatus());assertEquals(driver.getEmail(),orders.findById(o.getId()).orElseThrow().getLastActorEmail());assertNotNull(payments.findByAuctionItemId(x.getId()).orElseThrow().getReleaseDueAt());}
 @Test void wrongCodeAttemptsPersistAndLock(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);pay(x,a);Delivery d=deliveryService.createDelivery(x.getId(),seller.getEmail(),"ready");deliveryService.acceptDelivery(d.getId(),driver.getEmail());for(int i=0;i<5;i++)assertThrows(DeliveryService.InvalidCodeException.class,()->deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.PICKED_UP,"not-a-code","parcel"));assertEquals(5,deliveries.findById(d.getId()).orElseThrow().getPickupCodeAttempts());assertThrows(DeliveryService.InvalidCodeException.class,()->deliveryService.updateStatus(d.getId(),driver.getEmail(),DeliveryStatus.PICKED_UP,d.getPickupCode(),"parcel"));}
 @Test void cancellationStopsDeliveryAndRequestsNotConfirmsRefund(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);Payment p=pay(x,a);Delivery d=deliveryService.createDelivery(x.getId(),seller.getEmail(),"ready");paymentService.cancelPayment(x.getId(),a.getEmail());assertEquals(PaymentStatus.REFUND_REQUESTED,payments.findById(p.getId()).orElseThrow().getStatus());assertEquals(OrderStatus.CANCELLED,orders.findById(o.getId()).orElseThrow().getStatus());assertEquals(DeliveryStatus.CANCELLED,deliveries.findById(d.getId()).orElseThrow().getStatus());assertThrows(IllegalArgumentException.class,()->deliveryService.acceptDelivery(d.getId(),driver.getEmail()));}
 @Test void duplicateCallbackCannotUndoRefund(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);Payment p=pay(x,a);paymentService.cancelPayment(x.getId(),a.getEmail());paymentService.applyNotification(new PaymentService.ValidatedNotification(p.getId(),p.getPayfastPaymentId(),"COMPLETE"));assertEquals(PaymentStatus.REFUND_REQUESTED,payments.findById(p.getId()).orElseThrow().getStatus());}
 @Test void competingDriverAcceptanceHasOneWinner()throws Exception{AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);pay(x,a);Delivery d=deliveryService.createDelivery(x.getId(),seller.getEmail(),"ready");CountDownLatch start=new CountDownLatch(1);try(ExecutorService pool=Executors.newFixedThreadPool(2)){List<Future<Boolean>> results=new ArrayList<>();for(User u:List.of(driver,driver2))results.add(pool.submit(()->{start.await();try{deliveryService.acceptDelivery(d.getId(),u.getEmail());return true;}catch(IllegalArgumentException e){return false;}}));start.countDown();int accepted=0;for(var r:results)if(r.get(10,TimeUnit.SECONDS))accepted++;assertEquals(1,accepted);}}
 @Test void disputesPauseThenTrackReturnAndProviderRefund(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);Payment p=pay(x,a);OrderCase c=cases.open(o.getId(),a,"Wrong accessory","photo reference");assertEquals(OrderStatus.DISPUTED,orders.findById(o.getId()).orElseThrow().getStatus());cases.respond(c.getId(),seller,"packing photo");cases.decide(c.getId(),admin,"RETURN_REQUIRED","Review supports return","Pack securely; tracked return to seller","Seller ultimately pays documented transport");cases.returnSent(c.getId(),a,"Carrier reference ABC123");cases.returnReceived(c.getId(),seller,"Received and inspected; accessory mismatch confirmed");cases.decide(c.getId(),admin,"REFUND","Inspection supports full refund",null,null);assertEquals(PaymentStatus.REFUND_REQUESTED,payments.findById(p.getId()).orElseThrow().getStatus());paymentService.recordSettlement(p.getId(),true,"SANDBOX-refund-"+p.getId(),admin.getEmail());assertEquals(PaymentStatus.REFUNDED,payments.findById(p.getId()).orElseThrow().getStatus());}
 @Test void adminCannotRegisterPubliclyAndPrivateAuctionNamesRequireAuth()throws Exception{
  mvc.perform(post("/api/users/register").contentType("application/json").content("{\"fullName\":\"Test\",\"email\":\""+UUID.randomUUID()+"@example.test\",\"password\":\"Password123\",\"role\":\"ADMIN\"}")).andExpect(status().isBadRequest());
  mvc.perform(get("/api/auctions/my-wins")).andExpect(status().isUnauthorized());mvc.perform(get("/api/auctions/my-active-bids")).andExpect(status().isUnauthorized());
 }
 @Test void bannedTokenCannotContinue()throws Exception{String token=tokens.generateToken(a.getEmail());userService.setBanStatus(a.getId(),true);mvc.perform(get("/api/users/me").header("Authorization","Bearer "+token)).andExpect(status().isUnauthorized());}
 @Test void foreignBuyerCannotReadPaymentStatus(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);pay(x,a);assertThrows(SecurityException.class,()->paymentService.getPaymentByAuctionId(x.getId(),b.getEmail()));}
 @Test void bidderIdentityNotInPublicAuctionResult(){AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());close(x);var publicView=mapper.map(List.of(auctions.findById(x.getId()).orElseThrow()),null).getFirst();assertNull(publicView.getWinnerEmail());assertNull(publicView.getOwnerEmail());assertFalse(publicView.isCanPay());assertTrue(publicView.isHasWinner());}

 @Test void httpMutationsMapWithoutOpenSessionAndKeepWrongCodeCounter()throws Exception{
  AuctionItem x=auction(null);bidService.placeBid(x.getId(),100,a.getEmail());Order o=close(x);pay(x,a);
  String sellerToken="Bearer "+tokens.generateToken(seller.getEmail()),driverToken="Bearer "+tokens.generateToken(driver.getEmail()),buyerToken="Bearer "+tokens.generateToken(a.getEmail());
  mvc.perform(post("/api/deliveries").header("Authorization",sellerToken).contentType("application/json").content("{\"auctionId\":\""+x.getId()+"\",\"preparationEvidence\":\"intact and sealed\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("auctionTitle").value("Test item"));
  Delivery d=deliveries.findByAuctionItemId(x.getId()).orElseThrow();
  mvc.perform(put("/api/deliveries/"+d.getId()+"/accept").header("Authorization",driverToken)).andExpect(status().isOk());
  mvc.perform(put("/api/deliveries/"+d.getId()+"/status").header("Authorization",driverToken).param("status","PICKED_UP").param("code","wrong").param("evidence","sealed"))
   .andExpect(status().isBadRequest());
  assertEquals(1,deliveries.findById(d.getId()).orElseThrow().getPickupCodeAttempts());
  mvc.perform(post("/api/cases/order/"+o.getId()).header("Authorization",buyerToken).contentType("application/json").content("{\"reason\":\"Wrong item\",\"evidence\":\"photo\"}"))
   .andExpect(status().isOk()).andExpect(jsonPath("status").value("OPEN"));
 }
 @Autowired com.mambesi.action.message.MessageService messages;
 @Test void privateConversationCannotBeReadOrSpoofed(){
  var request=new com.mambesi.action.message.SendMessageRequest();
  org.springframework.test.util.ReflectionTestUtils.setField(request,"receiverEmail",b.getEmail());org.springframework.test.util.ReflectionTestUtils.setField(request,"content","Delivery question");
  var message=messages.sendMessage(a.getEmail(),request);
  assertThrows(SecurityException.class,()->messages.getThread(message.getThreadId(),c.getEmail()));
  assertEquals(1,messages.getThreads(a.getEmail()).size());
  org.springframework.test.util.ReflectionTestUtils.setField(request,"threadId","unrelated-thread");assertThrows(SecurityException.class,()->messages.sendMessage(a.getEmail(),request));
 }
}
