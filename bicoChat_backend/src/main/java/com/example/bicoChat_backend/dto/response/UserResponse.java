package com.example.bicoChat_backend.dto.response;

import com.example.bicoChat_backend.model.User;
import com.fasterxml.jackson.annotation.JsonProperty;

public class UserResponse {
    @JsonProperty("id")
    private String id;

    @JsonProperty("user")
    private User user;

    public UserResponse() {
    }

    public UserResponse(String id, User user) {
        this.id = id;
        this.user = user;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public User getUser() {
        return user;
    }

    public void setUser(User user) {
        this.user = user;
    }

    @Override
    public String toString() {
        return "UserResponse{" +
                "id='" + id + '\'' +
                ", user=" + user +
                '}';
    }
}