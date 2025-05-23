package com.example.bicoChat_backend.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public class Message {

    @JsonProperty("content")
    private String content;

    @JsonProperty("sender")
    private String sender;

    private String image; // aggiunto
    public String getImage() { return image; }
    public void setImage(String image) { this.image = image; }

    @JsonProperty("timestamp")
    private String timestamp;

    @JsonProperty("deleted")
    private boolean deleted;

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }


    @JsonProperty("read")
    private boolean read;

    private String id;

    public Message() {}

    public Message(String content, String sender, String timestamp, boolean read, String image) {
        this.content = content;
        this.sender = sender;
        this.timestamp = timestamp;
        this.read = read;
        this.image = image;
    }

    // Getter and Setter
    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getSender() {
        return sender;
    }

    public void setSender(String sender) {
        this.sender = sender;
    }

    public String getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(String timestamp) {
        this.timestamp = timestamp;
    }

    public boolean isRead() {
        return read;
    }

    public void setRead(boolean read) {
        this.read = read;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }//

    @Override
    public String toString() {
        return "Message{" +
                "id='" + id + '\'' +
                ", content='" + content + '\'' +
                ", sender='" + sender + '\'' +
                ", timestamp='" + timestamp + '\'' +
                ", read=" + read +
                ", image=" + image + '\'' +
                '}';
    }
}