package com.mambesi.action.auction;

import com.mambesi.action.auction.dto.AuctionRequest;
import com.mambesi.action.auction.dto.AuctionResponse;
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
@RequestMapping("/api/auctions")
public class AuctionController {

    private final AuctionService auctionService;
    private final JwtService jwtService;

    public AuctionController(AuctionService auctionService, JwtService jwtService) {
        this.auctionService = auctionService;
        this.jwtService = jwtService;
    }

    @PostMapping
    public AuctionResponse createAuction(@Valid @RequestBody AuctionRequest request,
                                         HttpServletRequest httpRequest) {

        String authHeader = httpRequest.getHeader("Authorization");
        String email = jwtService.extractEmail(authHeader.substring(7));

        AuctionItem item = new AuctionItem();
        item.setTitle(request.getTitle());
        item.setDescription(request.getDescription());
        item.setStartingPrice(request.getStartingPrice());
        item.setStartTime(request.getStartTime());
        item.setEndTime(request.getEndTime());

        AuctionItem saved = auctionService.createAuction(item, email);

        return mapToResponse(saved);
    }

    @GetMapping
    public List<AuctionResponse> getAllAuctions() {
        return auctionService.getAllAuctions()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public AuctionResponse getAuctionById(@PathVariable UUID id) {
        return mapToResponse(auctionService.getAuctionById(id));
    }

    @DeleteMapping("/{id}")
    public void deleteAuction(@PathVariable UUID id, HttpServletRequest httpRequest) {
        String email = jwtService.extractEmail(
                httpRequest.getHeader("Authorization").substring(7)
        );
        auctionService.deleteAuction(id, email);
    }

    @GetMapping("/won/{userId}")
    public List<AuctionResponse> getAuctionsWonByUser(@PathVariable UUID userId) {
        return auctionService.getAuctionsWonByUser(userId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @GetMapping("/my-wins")
    public List<AuctionResponse> getMyWins() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return auctionService.getMyWins(user.getEmail())
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private AuctionResponse mapToResponse(AuctionItem item) {
        return new AuctionResponse(
                item.getId(),
                item.getTitle(),
                item.getDescription(),
                item.getCurrentPrice(),
                item.isActive(),
                item.getStartTime(),
                item.getEndTime(),
                item.getOwner() != null ? item.getOwner().getEmail() : null,
                item.getWinner() != null ? item.getWinner().getEmail() : null,
                item.getPaymentDeadline()
        );
    }
    @PutMapping("/{id}/close")
    public AuctionResponse forceClose(@PathVariable UUID id) {
        AuctionItem auction = auctionService.getAuctionById(id);
        AuctionItem closed = auctionService.closeAuction(auction);
        return mapToResponse(closed);
    }
    @PutMapping("/{id}/reopen")
    public AuctionResponse reopenAuction(@PathVariable UUID id,
                                         HttpServletRequest httpRequest) {
        String email = jwtService.extractEmail(
                httpRequest.getHeader("Authorization").substring(7)
        );
        return mapToResponse(auctionService.reopenAuction(id, email));
    }
}