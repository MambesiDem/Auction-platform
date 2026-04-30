package com.mambesi.action.user.dto;

import com.mambesi.action.user.Role;
import java.util.UUID;

public class LoginResponse {

    private String token;
    private UUID id;
    private String fullName;
    private String email;
    private Role role;

    public LoginResponse(String token, UUID id, String fullName, String email, Role role) {
        this.token = token;
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
    }

    public String getToken() { return token; }
    public UUID getId() { return id; }
    public String getFullName() { return fullName; }
    public String getEmail() { return email; }
    public Role getRole() { return role; }
}