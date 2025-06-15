package com.example.bicoChat_backend.dto.request;

import lombok.Data;

@Data
public class FriendRequestDTO {
    private String fromUid;
    private String toUid;
}
