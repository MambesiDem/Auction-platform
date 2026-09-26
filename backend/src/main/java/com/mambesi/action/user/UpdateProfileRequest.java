package com.mambesi.action.user;

public class UpdateProfileRequest {
    private String fullName;
    private String currentPassword;
    private String newPassword;

    public String getFullName() { return fullName; }
    public String getCurrentPassword() { return currentPassword; }
    public String getNewPassword() { return newPassword; }
}