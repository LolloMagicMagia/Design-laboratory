package com.example.bicoChat_backend.model;

import java.time.LocalDateTime;

public class Message {
    private String id;
    private String chatId;
    private String sender;
    private String content;
    private LocalDateTime timestamp;
    private boolean read;

    // Costruttori
    public Message() {
    }

    public Message(String id, String chatId, String sender, String content, LocalDateTime timestamp, boolean read) {
        this.id = id;
        this.chatId = chatId;
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp;
        this.read = read;
    }

    // Getter e setter
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(LocalDateTime timestamp) {
        this.timestamp = timestamp;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }
}