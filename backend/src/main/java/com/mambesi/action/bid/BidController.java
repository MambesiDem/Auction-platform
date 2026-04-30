package com.mambesi.action.bid;

import com.mambesi.action.bid.dto.BidRequest;
import com.mambesi.action.bid.dto.BidResponse;
import com.mambesi.action.security.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/bids")
public class BidController {

    private final BidService bidService;
    private final JwtService jwtService;

    public BidController(BidService bidService, JwtService jwtService) {
        this.bidService = bidService;
        this.jwtService = jwtService;
    }

    @PostMapping("/{auctionId}")
    public BidResponse placeBid(@PathVariable UUID auctionId,
                                @Valid @RequestBody BidRequest request,
                                HttpServletRequest httpRequest) {

        String authHeader = httpRequest.getHeader("Authorization");
        String token = authHeader.substring(7);
        String email = jwtService.extractEmail(token);

        Bid bid = bidService.placeBid(auctionId, email, request.getAmount());

        return mapToResponse(bid);
    }

    @GetMapping("/{auctionId}")
    public List<BidResponse> getBidsForAuction(@PathVariable UUID auctionId) {
        return bidService.getBidsForAuction(auctionId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    private BidResponse mapToResponse(Bid bid) {
        return new BidResponse(
                bid.getId(),
                bid.getAmount(),
                bid.getBidder().getEmail(),
                bid.getTimestamp()
        );
    }
}