package com.mambesi.action.user;

import com.mambesi.action.user.dto.LoginRequest;
import com.mambesi.action.user.dto.LoginResponse;
import com.mambesi.action.user.dto.UserRequest;
import com.mambesi.action.user.dto.UserResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import com.mambesi.action.seller.SellerProfile;
import com.mambesi.action.seller.SellerProfileService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;
    private final SellerProfileService sellerProfiles;

    public UserController(UserService userService, SellerProfileService sellerProfiles) {
        this.userService = userService;
        this.sellerProfiles = sellerProfiles;
    }

    @PostMapping("/register")
    public UserResponse register(@Valid @RequestBody UserRequest request) {
        // Check the seller details first, so a bad request leaves no half-created account.
        SellerProfile.Type sellerType = null;
        String businessName = null;

        if (request.getRole() == Role.SELLER) {
            sellerType = sellerProfiles.parseType(request.getSellerType());
            businessName = request.getBusinessName() == null
                    ? null
                    : request.getBusinessName().trim();

            if (sellerType != SellerProfile.Type.INDIVIDUAL
                    && (businessName == null || businessName.length() < 2)) {
                throw new IllegalArgumentException("Enter your business or trading name.");
            }
        }

        User user = new User();
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPassword(request.getPassword());
        user.setRole(request.getRole());

        User savedUser = userService.registerUser(user);

        if (savedUser.getRole() == Role.SELLER) {
            sellerProfiles.ensureProfile(
                    savedUser,
                    sellerType,
                    sellerType == SellerProfile.Type.INDIVIDUAL ? null : businessName
            );
        }

        return new UserResponse(
                savedUser.getId(),
                savedUser.getFullName(),
                savedUser.getEmail(),
                savedUser.getRole(),
                savedUser.isBanned()
        );
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return userService.login(request.getEmail(), request.getPassword());// returns LoginResponse
    }

    @GetMapping("/me")
    public UserResponse getMe() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return new UserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                user.isBanned()
        );
    }
    @PutMapping("/{id}/ban")
    public UserResponse banUser(@PathVariable UUID id) {
        return userService.setBanStatus(id, true);
    }

    @PutMapping("/{id}/unban")
    public UserResponse unbanUser(@PathVariable UUID id) {
        return userService.setBanStatus(id, false);
    }
    @GetMapping
    public List<UserResponse> getAllUsers() {
        return userService.getAllUsers();
    }
    public record AdminRequest(@jakarta.validation.constraints.NotBlank String fullName,
                               @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email String email,
                               @jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Size(min=8) String password) {}
    @PostMapping("/create-admin")
    public UserResponse createAdmin(@Valid @RequestBody AdminRequest request) {
        return userService.createAdmin(
                request.fullName(),
                request.email(),
                request.password()
        );
    }
    @PutMapping("/me")
    public UserResponse updateProfile(@RequestBody UpdateProfileRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        User user = (User) auth.getPrincipal();
        return userService.updateProfile(user.getEmail(), request);
    }
}