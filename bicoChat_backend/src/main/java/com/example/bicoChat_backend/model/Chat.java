package com.example.bicoChat_backend.model;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Comparator;
import java.util.stream.Collectors;

public class Chat {
    private String id;
    private String name;
    private String type; // "individual" o "group"
    private List<String> participants;
    private LastMessage lastMessage;
    private int unreadCount;
    private List<Message> messages = new ArrayList<>();

    // Add methods to manage messages
    public void addMessage(Message message) {
        this.messages.add(message);
    }

    //ordinamento in stile "funzionale" dei messaggi in fase di richiesta
    public List<Message> getMessages() {
        return messages.stream()
                .sorted(Comparator.comparing(Message::getTimestamp))
                .collect(Collectors.toList());
    }

    // Classe interna per l'ultimo messaggio
    public static class LastMessage {
        private String sender;
        private String senderName;
        private String content;
        private LocalDateTime timestamp;
        private boolean read;

        public LastMessage() {
        }

        public LastMessage(String sender, String senderName, String content, LocalDateTime timestamp, boolean read) {
            this.sender = sender;
            this.senderName = senderName;
            this.content = content;
            this.timestamp = timestamp;
            this.read = read;
        }

        // Getter e setter
        public String getSender() {
            return sender;
        }

        public void setSender(String sender) {
            this.sender = sender;
        }

        public String getSenderName() {
            return senderName;
        }

        public void setSenderName(String senderName) {
            this.senderName = senderName;
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

    // Costruttori
    public Chat() {
        this.participants = new ArrayList<>();
    }

    public Chat(String id, String name, String type, List<String> participants) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.participants = participants;
        this.unreadCount = 0;
    }

    public Chat(String id, String name, List<String> participants) {
        this.id = id;
        this.name = name;
        this.type = "individual";
        this.participants = participants;
        this.unreadCount = 0;
    }

    // Getter e setter
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getType() {
        return type;
    }

    public void setType(String type) {
        this.type = type;
    }

    public List<String> getParticipants() {
        return participants;
    }

    public void setParticipants(List<String> participants) {
        this.participants = participants;
    }

    public LastMessage getLastMessage() {
        return lastMessage;
    }

    public void setLastMessage(LastMessage lastMessage) {
        this.lastMessage = lastMessage;
    }

    public int getUnreadCount() {
        return unreadCount;
    }

    public void setUnreadCount(int unreadCount) {
        this.unreadCount = unreadCount;
    }

    public void incrementUnreadCount() {
        this.unreadCount++;
    }

    public void resetUnreadCount() {
        this.unreadCount = 0;
    }
}