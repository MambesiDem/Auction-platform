package com.mambesi.action.watchlist;

import com.mambesi.action.auction.AuctionItem;
import com.mambesi.action.auction.dto.AuctionResponse;
import com.mambesi.action.user.User;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/watchlist")
public class WatchlistController {

    private final WatchlistService watchlistService;

    public WatchlistController(WatchlistService watchlistService) {
        this.watchlistService = watchlistService;
    }

    @GetMapping
    public List<AuctionResponse> getWatchlist() {
        String email = getEmail();
        return watchlistService.getWatchlist(email)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @PostMapping("/{auctionId}")
    public ResponseEntity<Void> add(@PathVariable UUID auctionId) {
        watchlistService.addToWatchlist(auctionId, getEmail());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{auctionId}")
    public ResponseEntity<Void> remove(@PathVariable UUID auctionId) {
        watchlistService.removeFromWatchlist(auctionId, getEmail());
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{auctionId}/check")
    public ResponseEntity<Boolean> check(@PathVariable UUID auctionId) {
        return ResponseEntity.ok(watchlistService.isWatchlisted(auctionId, getEmail()));
    }

    private String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((User) auth.getPrincipal()).getEmail();
    }

    private AuctionResponse mapToResponse(AuctionItem item) {
        return new AuctionResponse(
                item.getId(), item.getTitle(), item.getDescription(),
                item.getCurrentPrice(), item.isActive(),
                item.getStartTime(), item.getEndTime(),
                item.getOwner() != null ? item.getOwner().getEmail() : null,
                item.getWinner() != null ? item.getWinner().getEmail() : null,
                item.getPaymentDeadline(), item.getImageUrl()
        );
    }
}