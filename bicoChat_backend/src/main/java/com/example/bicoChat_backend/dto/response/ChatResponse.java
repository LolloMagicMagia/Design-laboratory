package com.example.bicoChat_backend.dto.response;

import com.example.bicoChat_backend.model.Chat;
import com.fasterxml.jackson.annotation.JsonProperty;

public class ChatResponse {
    @JsonProperty("id")
    private String id;

    @JsonProperty("chat")
    private Chat chat;

    public ChatResponse() {
    }

    public ChatResponse(String id, Chat chat) {
        this.id = id;
        this.chat = chat;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Chat getChat() {
        return chat;
    }

    public void setChat(Chat chat) {
        this.chat = chat;
    }

    @Override
    public String toString() {
        return "ChatResponse{" +
                "id='" + id + '\'' +
                ", chat=" + chat +
                '}';
    }
}