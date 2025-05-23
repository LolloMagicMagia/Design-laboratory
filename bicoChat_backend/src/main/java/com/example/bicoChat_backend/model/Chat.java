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

    private String description;

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    @JsonProperty("title")
    private String title; // specifico per gruppi

    @JsonProperty("type")
    private String type; // "individual" or "group"

    @JsonProperty("participants")
    private List<String> participants;

    @JsonProperty("messages")
    private Map<String, Message> messages;

    @JsonProperty("creator")
    private String creator; // solo per gruppi

    @JsonProperty("admin")
    private Map<String, Object> admin; // mappa creator/other

    @JsonProperty("avatar")
    private String avatar; // base64 opzionale per gruppi

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

    // Getters and Setters
    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
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

    public String getCreator() {
        return creator;
    }

    public void setCreator(String creator) {
        this.creator = creator;
    }

    public Map<String, Object> getAdmin() {
        return admin;
    }

    public void setAdmin(Map<String, Object> admin) {
        this.admin = admin;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
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
                ", title='" + title + '\'' +
                ", type='" + type + '\'' +
                ", participants=" + participants +
                ", creator='" + creator + '\'' +
                ", admin=" + admin +
                ", avatar='" + avatar + '\'' +
                ", messages=" + messages +
                '}';
    }
}