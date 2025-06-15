package com.example.bicoChat_backend.dto.response;

public class MessageUpdateNotification {

    private String chatId;
    private String messageId;

    public MessageUpdateNotification() {} // necessario per la serializzazione

    public MessageUpdateNotification(String chatId, String messageId) {
        this.chatId = chatId;
        this.messageId = messageId;
    }

    public String getChatId() {
        return chatId;
    }

    public void setChatId(String chatId) {
        this.chatId = chatId;
    }

    public String getMessageId() {
        return messageId;
    }

    public void setMessageId(String messageId) {
        this.messageId = messageId;
    }
}
