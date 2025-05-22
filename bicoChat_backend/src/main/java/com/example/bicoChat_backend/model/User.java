package com.example.bicoChat_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@JsonIgnoreProperties(ignoreUnknown = true)
public class User {

    @JsonProperty("id")
    private String id;  // Aggiungiamo l'ID

    private String bio;

    public String getBio() {
        return bio;
    }

    public void setBio(String bio) {
        this.bio = bio;
    }

    @JsonProperty("username")
    private String username;

    @JsonProperty("status")
    private String status;

    @JsonProperty("chatUser")
    private Map<String, ChatInfo> chatUser;

    private Map<String, String> friends; // oppure qualsiasi tipo tu usi

    public Map<String, String> getFriends() {
        return friends;
    }

    public void setFriends(Map<String, String> friends) {
        this.friends = friends;
    }

    @JsonProperty("email")
    private String email;

    @JsonProperty("avatar")
    private String avatar;  // Avatar come stringa Base64

    private String firstName;
    private String lastName;


    @JsonProperty("hiddenChats")
    private Map<String, Map<String, Object>> hiddenChats = new HashMap<>();


    // Costruttore per Firebase
    public User() {}

    // Costruttore aggiornato per supportare l'avatar in base64
    public User(String id, String username, String firstName, String lastName, String avatar) {
        this.id = id;
        this.username = username;
        this.firstName = firstName;
        this.lastName = lastName;
        this.avatar = avatar;
        this.status = "online";  // Stato di default
        this.chatUser = new HashMap<>();  // Inizializza come vuoto
    }

    // Getter e Setter
    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public Map<String, ChatInfo> getChatUser() {
        return chatUser;
    }

    public void setChatUser(Map<String, ChatInfo> chatUser) {
        this.chatUser = chatUser;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getFirstName() {
        return firstName;
    }

    public void setFirstName(String firstName) {
        this.firstName = firstName;
    }

    public String getLastName() {
        return lastName;
    }

    public void setLastName(String lastName) {
        this.lastName = lastName;
    }

    public Map<String, Map<String, Object>> getHiddenChats() {
        return hiddenChats;
    }

    public void setHiddenChats(Map<String, Map<String, Object>> hiddenChats) {
        this.hiddenChats = hiddenChats;
    }

    @Override
    public String toString() {
        return "User{" +
                "id='" + id + '\'' +
                ", username='" + username + '\'' +
                ", status='" + status + '\'' +
                ", chatUser=" + chatUser +
                ", email='" + email + '\'' +
                ", avatar='" + avatar + '\'' +
                ", firstName='" + firstName + '\'' +
                ", lastName='" + lastName + '\'' +
                '}';
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        User user = (User) o;
        return Objects.equals(id, user.id) &&
                Objects.equals(username, user.username) &&
                Objects.equals(status, user.status) &&
                Objects.equals(chatUser, user.chatUser) &&
                Objects.equals(email, user.email) &&
                Objects.equals(avatar, user.avatar) &&
                Objects.equals(firstName, user.firstName) &&
                Objects.equals(lastName, user.lastName);
    }

    @Override
    public int hashCode() {
        return Objects.hash(id, username, status, chatUser, email, avatar, firstName, lastName);
    }

    // Chat Info
    public static class ChatInfo {
        @JsonProperty("lastMessage")
        private String lastMessage;

        @JsonProperty("name")
        private String name;

        @JsonProperty("timestamp")
        private String timestamp;

        @JsonProperty("type")
        private String type;

        @JsonProperty("unreadCount")
        private int unreadCount;

        @JsonProperty("lastUser")
        private String lastUser;

        @JsonProperty("title")
        private String title;

        @JsonProperty("avatar")
        private String avatar;

        // Costruttore vuoto necessario per Firebase
        public ChatInfo() {}

        public ChatInfo(String lastMessage, String name, String timestamp, int unreadCount, String lastUser, String title, String avatar, String type) {
            this.lastMessage = lastMessage;
            this.name = name;
            this.timestamp = timestamp;
            this.unreadCount = unreadCount;
            this.lastUser = lastUser;
            this.title = title;
            this.avatar = avatar;
            this.type = type;
        }

        public String getType() {
            return type;
        }

        public void setType(String type) {
            this.type = type;
        }


        // Getter e Setter
        public String getLastMessage() {
            return lastMessage;
        }

        public void setLastMessage(String lastMessage) {
            this.lastMessage = lastMessage;
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public String getTimestamp() {
            return timestamp;
        }

        public void setTimestamp(String timestamp) {
            this.timestamp = timestamp;
        }

        public int getUnreadCount() {
            return unreadCount;
        }

        public void setUnreadCount(int unreadCount) {
            this.unreadCount = unreadCount;
        }

        public String getLastUser() {
            return lastUser;
        }

        public void setLastUser(String lastUser) {
            this.lastUser = lastUser;
        }

        public String getTitle() {
            return title;
        }

        public void setTitle(String title) {
            this.title = title;
        }

        @JsonProperty("avatar")
        public String getAvatar() {
            return avatar;
        }

        public void setAvatar(String avatar) {
            this.avatar = avatar;
        }

        @Override
        public String toString() {
            return "ChatInfo{" +
                    "lastMessage='" + lastMessage + '\'' +
                    ", name='" + name + '\'' +
                    ", timestamp='" + timestamp + '\'' +
                    ", unreadCount=" + unreadCount +
                    ", lastUser='" + lastUser + '\'' +
                    ", title='" + title + '\'' +
                    ", avatar='" + (avatar != null ? "[base64]" : "null") + '\'' +
                    ", type='" + type + '\'' +
                    '}';
        }

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            ChatInfo chatInfo = (ChatInfo) o;
            return unreadCount == chatInfo.unreadCount &&
                    Objects.equals(lastMessage, chatInfo.lastMessage) &&
                    Objects.equals(name, chatInfo.name) &&
                    Objects.equals(timestamp, chatInfo.timestamp) &&
                    Objects.equals(lastUser, chatInfo.lastUser) &&
                    Objects.equals(title, chatInfo.title) &&
                    Objects.equals(avatar, chatInfo.avatar);
        }

        @Override
        public int hashCode() {
            return Objects.hash(lastMessage, name, timestamp, unreadCount, lastUser, title, avatar);
        }
    }

}