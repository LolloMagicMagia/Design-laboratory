package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.MessageResponse;
import com.example.bicoChat_backend.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class MessageService {

    @Autowired
    private ChatService chatService;

    /**
     * Retrieves all the messages of a specific chat.
     * @param chatId ID of the chat
     * @return CompletableFuture with the list of MessageResponse
     */
    public CompletableFuture<List<MessageResponse>> getMessages(String chatId) {
        return chatService.getMessagesMap(chatId)
                .thenApply(messagesMap -> {
                    List<MessageResponse> messageResponseList = new ArrayList<>();
                    if (messagesMap != null) {
                        for (Map.Entry<String, Message> entry : messagesMap.entrySet()) {
                            messageResponseList.add(new MessageResponse(entry.getKey(), entry.getValue()));
                        }
                        // Sorts messages by timestamp
                        messageResponseList.sort(Comparator.comparing(mr -> mr.getMessage().getTimestamp()));
                    }
                    return messageResponseList;
                });
    }

    /**
     * Adds a new message to a chat.
     * @param chatId ID of the chat
     * @param sender ID of the sender
     * @param content Content of the message
     * @return CompletableFuture with the created MessageResponse
     */
    public CompletableFuture<MessageResponse> addMessage(String chatId, String sender, String content) {
        // Creates the new message
        Message message = new Message();
        message.setSender(sender);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        message.setRead("currentUser".equals(sender)); // The message is read if sent by the current user

        // Adds the message to the chat
        return chatService.addMessage(chatId, message)
                .thenApply(entry -> new MessageResponse(entry.getKey(), entry.getValue()));
    }

    /**
     * Marks all the messages of a chat as read for a specific user.
     * @param chatId ID of the chat
     * @param userId ID of the user
     * @return CompletableFuture that completes when the operation is finished
     */
    public CompletableFuture<Void> markChatMessagesAsRead(String chatId, String userId) {
        return chatService.markChatAsRead(chatId, userId);
    }
}
