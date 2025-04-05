package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/chats/{chatId}/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private ChatService chatService;

    @GetMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getMessagesByChatId(@PathVariable String chatId) {
        return chatService.getChatById(chatId)
                .thenCompose(optionalChat -> {
                    if (optionalChat.isPresent()) {
                        return messageService.getMessages(chatId)
                                .thenApply(messages -> {
                                    Map<String, Object> response = new HashMap<>();
                                    response.put("messages", messages);
                                    return ResponseEntity.ok(response);
                                });
                    } else {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Chat not found");
                        return CompletableFuture.completedFuture(
                                ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse));
                    }
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Error while getting messages");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }

    @PostMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> sendMessage(
            @PathVariable String chatId,
            @RequestBody Map<String, Object> messageData) {

        return chatService.getChatById(chatId)
                .thenCompose(optionalChat -> {
                    if (optionalChat.isPresent()) {
                        // Verifica dei dati necessari
                        if (messageData.get("content") == null) {
                            Map<String, Object> errorResponse = new HashMap<>();
                            errorResponse.put("error", "Message content missing");
                            return CompletableFuture.completedFuture(
                                    ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse));
                        }

                        // Imposta il mittente come l'utente corrente se non specificato
                        String sender = messageData.containsKey("sender") ?
                                (String) messageData.get("sender") : "currentUser";
                        String content = (String) messageData.get("content");

                        return messageService.addMessage(chatId, sender, content)
                                .thenApply(newMessage -> {
                                    Map<String, Object> response = new HashMap<>();
                                    response.put("message", newMessage);
                                    return ResponseEntity.status(HttpStatus.CREATED).body(response);
                                });
                    } else {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Chat not found");
                        return CompletableFuture.completedFuture(
                                ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse));
                    }
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Error while sending message");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }

    @PatchMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> markMessagesAsRead(
            @PathVariable String chatId,
            @RequestBody Map<String, Object> updateData) {

        String userId = updateData.containsKey("userId") ?
                (String) updateData.get("userId") : "currentUser";

        return messageService.markChatMessagesAsRead(chatId, userId)
                .thenApply(v -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("success", true);
                    return ResponseEntity.ok(response);
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Error while marking chat messages as read");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }
}