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
    private final com.mambesi.action.auction.AuctionResponseMapper mapper;

    public WatchlistController(WatchlistService watchlistService, com.mambesi.action.auction.AuctionResponseMapper mapper) {
        this.watchlistService = watchlistService;
        this.mapper = mapper;
    }

    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping
    public List<AuctionResponse> getWatchlist() {
        String email = getEmail();
        return mapper.map(watchlistService.getWatchlist(email), (User) SecurityContextHolder.getContext().getAuthentication().getPrincipal());
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

    @org.springframework.transaction.annotation.Transactional(readOnly=true)
    @GetMapping("/{auctionId}/check")
    public ResponseEntity<Boolean> check(@PathVariable UUID auctionId) {
        return ResponseEntity.ok(watchlistService.isWatchlisted(auctionId, getEmail()));
    }

    private String getEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return ((User) auth.getPrincipal()).getEmail();
    }

}
