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
import java.util.Optional;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getAllChats() {
        try {
            List<Chat> chats = chatService.getAllChats();
            Map<String, Object> response = new HashMap<>();
            response.put("chats", chats);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nel recupero delle chat");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<Map<String, Object>> getChatById(@PathVariable String id) {
        try {
            Optional<Chat> optionalChat = chatService.getChatById(id);  // optionalChat to manage null value
            if (optionalChat.isPresent()) {
                Chat chat = optionalChat.get();
                Map<String, Object> response = new HashMap<>();
                response.put("chat", chat);
                return ResponseEntity.ok(response);
            }
            else{
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Chat non trovata");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nel recupero della chat");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    // TODO --> Capire da chi viene passato l'argomento chat già istanziato come tipo Chat
    @PostMapping
    public ResponseEntity<Map<String, Object>> createChat(@RequestBody Chat chatData) {
        try {
            // Verifica dei dati necessari
            if (chatData.getName() == null || chatData.getType() == null || chatData.getParticipants() == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Dati mancanti. Richiesti: name, type, participants");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            }

            Chat newChat = chatService.createChat(chatData);
            Map<String, Object> response = new HashMap<>();
            response.put("chat", newChat);
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nella creazione della chat");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Map<String, Object>> updateChat(@PathVariable String id, @RequestBody Map<String, Object> updateData) {
        try {
            // Verifica se l'operazione è per marcare la chat come letta
            if (updateData.containsKey("markAsRead") && (boolean) updateData.get("markAsRead")) {
                boolean success = chatService.markChatAsRead(id);

                if (!success) {
                    Map<String, Object> errorResponse = new HashMap<>();
                    errorResponse.put("error", "Chat non trovata");
                    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
                }

                Map<String, Object> response = new HashMap<>();
                response.put("success", true);
                return ResponseEntity.ok(response);
            }

            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Operazione non supportata");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nell'aggiornamento della chat");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}
