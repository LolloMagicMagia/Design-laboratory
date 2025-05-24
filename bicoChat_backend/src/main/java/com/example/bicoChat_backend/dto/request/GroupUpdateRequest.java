package com.example.bicoChat_backend.dto.request;

import lombok.Data;

@Data
public class GroupUpdateRequest {
    private String title;
    private String description;
    private String avatar;
    private String requesterId;
}