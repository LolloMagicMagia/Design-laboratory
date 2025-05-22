package com.example.bicoChat_backend.dto.request;

import lombok.Data;

@Data
public class RoleUpdateRequest {
    private String requesterId;
    private String targetUserId;
    private String newRole; // "admin" o "member"
}

