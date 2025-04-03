package com.example.bicoChat_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Chat {

    @JsonProperty("name")
    private String name;

    @JsonProperty("type")
    private String type; // "individual" or "group"

    @JsonProperty("participants")
    private List<String> participants;

    @JsonProperty("messages")
    private Map<String, Message> messages;

    // Constructors
    public Chat() {
        this.participants = new ArrayList<>();
    }

    public Chat(String name, String type, List<String> participants) {
        this.name = name;
        this.type = type;
        this.participants = participants;
    }

    public Chat(String name, List<String> participants) {
        this.name = name;
        this.type = "individual";
        this.participants = participants;
    }

    // Getter e Setter
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

    public Map<String, Message> getMessages() {
        return messages;
    }

    public void setMessages(Map<String, Message> messages) {
        this.messages = messages;
    }

    // Adding messages
    public void addMessage(String messageId, Message message) {
        if (this.messages == null) {
            throw new IllegalStateException("Map of messages is not initialized");
        }
        this.messages.put(messageId, message);
    }

    @Override
    public String toString() {
        return "Chat{" +
                "name='" + name + '\'' +
                ", type='" + type + '\'' +
                ", participants=" + participants +
                ", messages=" + messages +
                '}';
    }
}