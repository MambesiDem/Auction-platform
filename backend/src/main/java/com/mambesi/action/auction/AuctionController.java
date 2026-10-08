package com.mambesi.action.auction;
import com.mambesi.action.auction.dto.*;
import com.mambesi.action.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;
import java.util.*;
@RestController @RequestMapping("/api/auctions")
public class AuctionController {
    private final AuctionService service;private final AuctionResponseMapper mapper;
    public AuctionController(AuctionService s,AuctionResponseMapper m){service=s;mapper=m;}
    @PostMapping public AuctionResponse create(@Valid @RequestBody AuctionRequest r,Authentication auth){
        AuctionItem a=new AuctionItem();a.setTitle(r.getTitle());a.setDescription(r.getDescription());a.setStartingPrice(r.getStartingPrice());a.setReservePrice(r.getReservePrice());a.setStartTime(r.getStartTime());a.setEndTime(r.getEndTime());a.setImageUrl(r.getImageUrl());return one(service.createAuction(a,user(auth).getEmail()),auth);
    }
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping public List<AuctionResponse> all(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,@RequestParam(defaultValue="false")boolean activeOnly,Authentication auth){return mapper.map(activeOnly?service.getOpenAuctions(page,size):service.getAllAuctions(page,size),user(auth));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-listings") public List<AuctionResponse> listings(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,Authentication a){return mapper.map(service.getMyListings(user(a).getEmail(),page,size),user(a));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-wins") public List<AuctionResponse> wins(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,Authentication a){return mapper.map(service.getMyWins(user(a).getEmail(),page,size),user(a));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/won/{id}") public List<AuctionResponse> won(@PathVariable UUID id,@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,Authentication a){return mapper.map(service.getAuctionsWonByUser(id,page,size),user(a));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-losses") public List<AuctionResponse> losses(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,Authentication a){return mapper.map(service.getMyLosses(user(a).getEmail(),page,size),user(a));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/my-active-bids") public List<AuctionResponse> active(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="100")int size,Authentication a){return mapper.map(service.getMyActiveBids(user(a).getEmail(),page,size),user(a));}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/{id}") public AuctionResponse detail(@PathVariable UUID id,Authentication a){return one(service.getAuctionById(id),a);}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/{id}/my-bid") public Double bid(@PathVariable UUID id,Authentication a){Double v=service.getMyHighestBid(id,user(a).getEmail());return v==null?0:v;}
    @DeleteMapping("/{id}") public void delete(@PathVariable UUID id,Authentication a){service.deleteAuction(id,user(a).getEmail());}
    @PutMapping("/{id}/close") public AuctionResponse close(@PathVariable UUID id,Authentication a){return one(service.closeAuction(id),a);}
    @PutMapping("/{id}/reopen") public AuctionResponse relist(@PathVariable UUID id,Authentication a){return one(service.reopenAuction(id,user(a).getEmail()),a);}
    public record OfferView(UUID id,UUID auctionId,String title,double amount,java.time.LocalDateTime expiresAt){}
    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/offers") public List<OfferView> offers(Authentication a){return service.getOffers(user(a).getEmail()).stream().map(o->new OfferView(o.getId(),o.getAuction().getId(),o.getAuction().getTitle(),o.getAmount(),o.getExpiresAt())).toList();}
    public record Response(boolean accept){}
    @PutMapping("/offers/{id}") public void respond(@PathVariable UUID id,@RequestBody Response r,Authentication a){service.respondToOffer(id,user(a).getEmail(),r.accept());}
    private AuctionResponse one(AuctionItem item,Authentication a){return mapper.map(List.of(item),user(a)).get(0);}
    private User user(Authentication a){return a!=null && a.getPrincipal() instanceof User u?u:null;}
}
