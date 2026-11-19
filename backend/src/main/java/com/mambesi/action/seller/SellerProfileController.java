package com.mambesi.action.seller;

import com.mambesi.action.user.User;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/seller-profiles")
public class SellerProfileController {

    private final SellerProfileService service;

    public SellerProfileController(SellerProfileService service) {
        this.service = service;
    }

    @GetMapping("/mine")
    public List<SellerProfileService.ProfileView> mine(Authentication authentication) {
        return service.mine((User) authentication.getPrincipal());
    }
}