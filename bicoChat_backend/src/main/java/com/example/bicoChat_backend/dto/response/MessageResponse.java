package com.example.bicoChat_backend.dto.response;

import com.example.bicoChat_backend.model.Message;
import com.fasterxml.jackson.annotation.JsonProperty;

public class MessageResponse {
    @JsonProperty("id")
    private String id;

    @JsonProperty("message")
    private Message message;

    public MessageResponse() {
    }

    public MessageResponse(String id, Message message) {
        this.id = id;
        this.message = message;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public Message getMessage() {
        return message;
    }

    public void setMessage(Message message) {
        this.message = message;
    }

    @Override
    public String toString() {
        return "MessageResponse{" +
                "id='" + id + '\'' +
                ", message=" + message +
                '}';
    }
}