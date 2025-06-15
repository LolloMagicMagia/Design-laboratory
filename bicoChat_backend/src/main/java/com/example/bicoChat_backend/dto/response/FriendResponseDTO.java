package com.example.bicoChat_backend.dto.response;

import com.example.bicoChat_backend.model.User;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FriendResponseDTO {
    private String id;
    private String username;
    private String email;
    private String avatar;
    private String friendshipStatus;

    public FriendResponseDTO(String id, User user, String status) {
        this.id = id;
        this.username = user.getUsername();
        this.email = user.getEmail();
        this.avatar = user.getAvatar();
        this.friendshipStatus = status;
    }
}
