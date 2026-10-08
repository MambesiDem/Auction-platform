package com.mambesi.action.auction;
import com.mambesi.action.bid.*;
import com.mambesi.action.user.*;
import com.mambesi.action.order.*;
import com.mambesi.action.payment.*;
import com.mambesi.action.delivery.*;
import com.mambesi.action.notification.EmailService;
import com.mambesi.action.common.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import java.util.*;
@Service
public class AuctionService {
    @jakarta.persistence.PersistenceContext private jakarta.persistence.EntityManager entityManager;
    private final AuctionRepository auctions;private final UserRepository users;private final BidRepository bids;
    private final PaymentRepository payments;private final DeliveryRepository deliveries;private final OrderService orders;
    private final RunnerUpOfferRepository offers;private final EmailService email;private final SimpMessagingTemplate messages;
    @Value("${platform.commission:0.08}") private double commission;
    @Value("${auction.payment-minutes:15}") private int paymentMinutes;
    @Value("${auction.offer-minutes:15}") private int offerMinutes;
    public AuctionService(AuctionRepository a,UserRepository u,BidRepository b,PaymentRepository p,DeliveryRepository d,OrderService o,RunnerUpOfferRepository r,EmailService e,SimpMessagingTemplate m){auctions=a;users=u;bids=b;payments=p;deliveries=d;orders=o;offers=r;email=e;messages=m;}
    @Transactional
    public AuctionItem createAuction(AuctionItem a,String owner){
        if(a.getTitle()==null || a.getTitle().isBlank() || a.getDescription()==null || a.getDescription().isBlank()) throw new IllegalArgumentException("Title and description are required.");
        if(a.getStartTime()==null || a.getEndTime()==null || !a.getStartTime().isAfter(AppTime.now()) || !a.getEndTime().isAfter(a.getStartTime())) throw new IllegalArgumentException("Choose a future start and an end after the start.");
        if(Money.value(a.getStartingPrice()).signum()<=0) throw new IllegalArgumentException("Starting price must be positive.");
        if(a.getReservePrice()!=null && a.getReservePrice()<a.getStartingPrice()) throw new IllegalArgumentException("Reserve must be at least the starting price, or leave it blank.");
        if(paymentMinutes<1 || offerMinutes<1) throw new IllegalStateException("Auction time windows are not configured correctly.");
        Money.fee(a.getStartingPrice(),commission);
        a.setBidIncrement(5);a.setExtensionThresholdMinutes(3);a.setExtensionDurationMinutes(3);a.setCommissionRate(commission);
        a.setOwner(user(owner));a.setActive(true);AuctionItem saved=auctions.save(a);
        AfterCommit.run(()->messages.convertAndSend("/topic/auction-updated",saved.getId().toString()));return saved;
    }
    public List<AuctionItem> getAllAuctions(int page,int size){return auctions.findForPage(page(page,size));}
    public List<AuctionItem> getOpenAuctions(int page,int size){return auctions.findOpenForPage(AppTime.now(),page(page,size));}
    public List<AuctionItem> getMyListings(String email,int page,int size){return auctions.findByOwnerIdOrderByStartTimeDesc(user(email).getId(),page(page,size));}
    public List<AuctionItem> getMyWins(String email,int page,int size){return auctions.findByWinnerIdOrderByEndTimeDesc(user(email).getId(),page(page,size));}
    public List<AuctionItem> getAuctionsWonByUser(UUID id,int page,int size){return auctions.findByWinnerIdOrderByEndTimeDesc(id,page(page,size));}
    public List<AuctionItem> getMyLosses(String email,int page,int size){return auctions.findLostAuctionsByBidderId(user(email).getId(),page(page,size));}
    public List<AuctionItem> getMyActiveBids(String email,int page,int size){return auctions.findActiveBidsByBidderId(user(email).getId(),page(page,size));}
    public Double getMyHighestBid(UUID id,String email){var v=auctions.findHighestBidByUserAndAuction(id,user(email).getId());return v==null?null:v.doubleValue();}
    public AuctionItem getAuctionById(UUID id){return auctions.findById(id).orElseThrow(()->new IllegalArgumentException("Auction not found."));}
    @Transactional public AuctionItem closeExpiredAuction(UUID id){AuctionItem a=lock(id);return !a.isActive() || AppTime.now().isBefore(a.getEndTime())?a:closeLocked(a);}
    @Transactional public AuctionItem closeAuction(UUID id){return closeLocked(lock(id));}
    private AuctionItem closeLocked(AuctionItem a){
        if(!a.isActive()) return a;
        a.setActive(false);a.setWinner(null);a.setPaymentDeadline(null);
        Optional<Bid> top=bids.findFirstByAuctionItemIdOrderByAmountDescTimestampAsc(a.getId());
        if(top.isPresent() && meetsReserve(a,top.get().getAmount())){
            Bid b=top.get();a.setCurrentPrice(b.getAmount());a.setWinner(b.getBidder());
            Order o=orders.createOrderForAuctionWin(a,b.getBidder(),paymentMinutes);a.setPaymentDeadline(o.getPaymentDeadline());
            AfterCommit.run(()->email.sendAuctionWonEmail(b.getBidder().getEmail(),a.getTitle(),b.getAmount(),paymentMinutes));
        }
        auctions.save(a);notifyChanged(a.getId(),"/topic/auction-closed");return a;
    }
    @Transactional public void deleteAuction(UUID id,String owner){
        AuctionItem a=lock(id);requireOwner(a,owner);
        if(bids.existsByAuctionItemId(id) || orders.findByAuctionId(id).isPresent() || payments.findByAuctionItemId(id).isPresent() || deliveries.findByAuctionItemId(id).isPresent()) throw new IllegalArgumentException("This auction has transaction history and cannot be deleted. Keep it for your records.");
        auctions.delete(a);notifyChanged(id,"/topic/auction-updated");
    }
    @Transactional public AuctionItem reopenAuction(UUID id,String owner){
        AuctionItem old=lock(id);requireOwner(old,owner);
        if(old.isActive() || old.getWinner()!=null) throw new IllegalArgumentException("Only a closed auction without a winner can be relisted.");
        // New identity and empty bid history; the old auction remains untouched.
        AuctionItem a=new AuctionItem();a.setTitle(old.getTitle());a.setDescription(old.getDescription());a.setImageUrl(old.getImageUrl());a.setStartingPrice(old.getStartingPrice());a.setReservePrice(old.getReservePrice());a.setStartTime(AppTime.now().plusMinutes(1));a.setEndTime(AppTime.now().plusHours(24));return createAuction(a,owner);
    }
    @Transactional public void expirePaymentAndReassign(UUID id){
        AuctionItem a=lock(id);if(a.isActive() || a.isOfferWorkflowFinished()) return;
        for(RunnerUpOffer offer:offers.findByAuctionIdAndStatus(id,RunnerUpOffer.Status.OFFERED)){
            if(!AppTime.now().isBefore(offer.getExpiresAt())){offer.setStatus(RunnerUpOffer.Status.EXPIRED);offers.save(offer);}
        }
        Optional<Order> current=orders.findByAuctionId(id);
        if(current.isPresent() && current.get().getStatus()==OrderStatus.AWAITING_PAYMENT){
            Order o=current.get();if(o.getPaymentDeadline()==null || AppTime.now().isBefore(o.getPaymentDeadline())) return;
            // Pending attempts are uncertain. A callback or documented reconciliation must resolve them.
            if(payments.existsByOrderIdAndStatusIn(o.getId(),List.of(PaymentStatus.PENDING,PaymentStatus.HELD,PaymentStatus.REVIEW_REQUIRED,PaymentStatus.REFUND_REQUESTED,PaymentStatus.RELEASE_REQUESTED,PaymentStatus.RELEASED))) return;
            orders.transitionStatus(o.getId(),OrderStatus.CANCELLED,"system","Payment deadline expired without a confirmed or unresolved payment");
        }else if(current.isPresent() && (current.get().getStatus()!=OrderStatus.CANCELLED || !"Payment deadline expired without a confirmed or unresolved payment".equals(current.get().getLastReason()))) return;
        if(current.isEmpty()) return;
        if(offers.existsByAuctionIdAndStatus(id,RunnerUpOffer.Status.OFFERED)) return;
        Set<UUID> committed=new HashSet<>();
        // Each prior buyer is retained in order history and never offered the same item again.
        for(Order o:ordersForAuction(id)) committed.add(o.getBuyer().getId());
        for(int offset=0;;offset++){
            List<Bid> candidates=bids.findByAuctionItemIdOrderByAmountDescTimestampAsc(id,PageRequest.of(offset,100));
            for(Bid b:candidates){
                UUID buyer=b.getBidder().getId();
                if(committed.contains(buyer) || offers.existsByAuctionIdAndBuyerId(id,buyer) || !meetsReserve(a,b.getAmount()) || b.getBidder().isBanned()) continue;
                RunnerUpOffer offer=offers.save(new RunnerUpOffer(a,b.getBidder(),b.getAmount(),offerMinutes));
                AfterCommit.run(()->email.sendEmail(b.getBidder().getEmail(),"Optional offer: "+a.getTitle(),"You may accept this item at R"+Money.value(b.getAmount())+" within "+offerMinutes+" minutes. Declining has no penalty. Open your ConnSB orders page."));
                notifyChanged(id,"/topic/auction-reassigned");return;
            }
            if(candidates.size()<100) break;
        }
        a.setOfferWorkflowFinished(true);auctions.save(a);
    }
    private List<Order> ordersForAuction(UUID id){return orderRepository().findByAuctionItemIdIn(List.of(id));}
    @org.springframework.beans.factory.annotation.Autowired private OrderRepository orderRepository;
    private OrderRepository orderRepository(){return orderRepository;}
    @Transactional public RunnerUpOffer respondToOffer(UUID offerId,String buyer,boolean accept){
        RunnerUpOffer reference=offers.findById(offerId).orElseThrow(()->new IllegalArgumentException("Offer not found."));
        AuctionItem a=lock(reference.getAuction().getId());entityManager.refresh(reference);RunnerUpOffer offer=reference;
        if(!offer.getBuyer().getEmail().equals(buyer)) throw new SecurityException("This offer belongs to another buyer.");
        if(offer.getStatus()!=RunnerUpOffer.Status.OFFERED || !AppTime.now().isBefore(offer.getExpiresAt())) throw new IllegalArgumentException("This offer is no longer available.");
        if(!accept){offer.setStatus(RunnerUpOffer.Status.DECLINED);offers.save(offer);notifyChanged(a.getId(),"/topic/auction-reassigned");return offer;}
        Optional<Order> current=orders.findByAuctionId(a.getId());
        if(current.isPresent() && current.get().getStatus()!=OrderStatus.CANCELLED) throw new IllegalStateException("The previous order is still unresolved.");
        if(payments.existsByAuctionItemIdAndStatusIn(a.getId(),List.of(PaymentStatus.PENDING,PaymentStatus.HELD,PaymentStatus.REVIEW_REQUIRED,PaymentStatus.REFUND_REQUESTED,PaymentStatus.RELEASE_REQUESTED,PaymentStatus.RELEASED)))throw new IllegalStateException("A payment needs reconciliation before this offer can be accepted.");
        if(a.isActive() || !meetsReserve(a,offer.getAmount())) throw new IllegalStateException("This offer cannot be accepted.");
        a.setWinner(offer.getBuyer());a.setCurrentPrice(offer.getAmount());Order o=orders.createOrderForAuctionWin(a,offer.getBuyer(),paymentMinutes);a.setPaymentDeadline(o.getPaymentDeadline());auctions.save(a);
        offer.setStatus(RunnerUpOffer.Status.ACCEPTED);offers.save(offer);notifyChanged(a.getId(),"/topic/auction-reassigned");return offer;
    }
    public List<RunnerUpOffer> getOffers(String email){return offers.findByBuyerEmailAndStatus(email,RunnerUpOffer.Status.OFFERED).stream().filter(o->AppTime.now().isBefore(o.getExpiresAt())).toList();}
    private boolean meetsReserve(AuctionItem a,double amount){return a.getReservePrice()==null || a.getReservePrice()<=0 || Money.value(amount).compareTo(Money.value(a.getReservePrice()))>=0;}
    private AuctionItem lock(UUID id){return auctions.findByIdForUpdate(id).orElseThrow(()->new IllegalArgumentException("Auction not found."));}
    private User user(String email){return users.findByEmail(email).orElseThrow(()->new IllegalArgumentException("User not found."));}
    private void requireOwner(AuctionItem a,String email){if(!a.getOwner().getEmail().equals(email)) throw new SecurityException("Only the seller can do this.");}
    private PageRequest page(int number,int size){if(number<0 || size<1 || size>100) throw new IllegalArgumentException("Page must be non-negative and size between 1 and 100.");return PageRequest.of(number,size);}
    private void notifyChanged(UUID id,String topic){AfterCommit.run(()->messages.convertAndSend(topic,id.toString()));}
}
