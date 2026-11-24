package com.mambesi.action.user.dto;

import com.mambesi.action.user.Role;
import jakarta.validation.constraints.*;

public class UserRequest {

    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    private String password;

    @NotNull(message = "Role is required")
    private Role role;

    // Used only when the role is SELLER. Values: INDIVIDUAL, INFORMAL_BUSINESS, REGISTERED_BUSINESS.
    private String sellerType;

    @Size(max = 150)
    private String businessName;

    public String getSellerType() { return sellerType; }
    public String getBusinessName() { return businessName; }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public String getPassword() {
        return password;
    }

    public Role getRole() {
        return role;
    }
}