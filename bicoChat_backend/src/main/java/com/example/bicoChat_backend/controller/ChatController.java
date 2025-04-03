package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.service.ChatService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @GetMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getAllChats() {
        return chatService.getAllChats()
                .thenApply(chats -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("chats", chats);
                    return ResponseEntity.ok(response);
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Si è verificato un errore nel recupero delle chat");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }

    @GetMapping("/{id}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getChatById(@PathVariable String id) {
        return chatService.getChatById(id)
                .thenApply(optionalChat -> {
                    if (optionalChat.isPresent()) {
                        Map<String, Object> response = new HashMap<>();
                        response.put("chat", optionalChat.get());
                        return ResponseEntity.ok(response);
                    } else {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Chat non trovata");
                        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                    }
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Error during getChatById");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }

    @PostMapping
    public CompletableFuture<ResponseEntity<Map<String, Object>>> createChat(@RequestBody Chat chatData) {
        // Verify the necessary data
        if (chatData.getType() == null || chatData.getParticipants() == null) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Missing data. Required: type, participants");
            return CompletableFuture.completedFuture(
                    ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse));
        }

        return chatService.createChat(chatData)
                .thenApply(newChat -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("chat", newChat);
                    return ResponseEntity.status(HttpStatus.CREATED).body(response);
                })
                .exceptionally(ex -> {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Error during chat creation");
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                });
    }

    @PatchMapping("/{id}")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> updateChat(
            @PathVariable String id,
            @RequestBody Map<String, Object> updateData) {

        // Verifica se l'operazione è per marcare la chat come letta
        if (updateData.containsKey("markAsRead") && (boolean) updateData.get("markAsRead")) {
            String userId = updateData.containsKey("userId") ?
                    (String) updateData.get("userId") : "currentUser";

            return chatService.markChatAsRead(id, userId)
                    .thenApply(v -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("success", true);
                        return ResponseEntity.ok(response);
                    })
                    .exceptionally(ex -> {
                        Map<String, Object> errorResponse = new HashMap<>();
                        errorResponse.put("error", "Error while updating chat");
                        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
                    });
        }

        // Operation not supported
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", "Operation not supported");
        return CompletableFuture.completedFuture(
                ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse));
    }
}