package com.example.bicoChat_backend.dto.request;

import lombok.Data;

import java.util.List;

@Data
public class CreateGroupRequest {
    private List<String> participants; // incluso il creator
    private String creatorId;
    private String title;
    private String initialMessage;
    private String avatar; // opzionale, base64 o null
}
