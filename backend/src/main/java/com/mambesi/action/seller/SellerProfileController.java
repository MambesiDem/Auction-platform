package com.mambesi.action.seller;

import com.mambesi.action.user.User;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/seller-profiles")
public class SellerProfileController {

    public record UpdateRequest(
            @NotBlank @Size(min = 2, max = 150) String displayName,
            @NotBlank String sellerType
    ) {}

    private final SellerProfileService service;

    public SellerProfileController(SellerProfileService service) {
        this.service = service;
    }

    @GetMapping("/mine")
    public List<SellerProfileService.ProfileView> mine(Authentication authentication) {
        return service.mine((User) authentication.getPrincipal());
    }

    @PutMapping("/{id}")
    public SellerProfileService.ProfileView update(@PathVariable UUID id,
                                                   @Valid @RequestBody UpdateRequest request,
                                                   Authentication authentication) {
        return service.update(
                (User) authentication.getPrincipal(),
                id,
                request.displayName(),
                request.sellerType()
        );
    }
}