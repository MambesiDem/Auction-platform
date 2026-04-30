package com.mambesi.action.user.dto;

import com.mambesi.action.user.Role;

import java.util.UUID;

public class UserResponse {
    private UUID id;
    private String fullName;
    private String email;
    private Role role;
    private boolean banned;
    // constructor
    public UserResponse(UUID id, String fullName, String email, Role role, boolean banned) {
        this.id = id;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
        this.banned = banned;
    }

    public UUID getId() {
        return id;
    }

    public String getFullName() {
        return fullName;
    }

    public String getEmail() {
        return email;
    }

    public Role getRole() {
        return role;
    }
    public boolean isBanned() { return banned; }
}
