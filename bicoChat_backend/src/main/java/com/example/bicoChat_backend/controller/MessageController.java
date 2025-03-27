package com.example.bicoChat_backend.controller;


import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.MessageService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chats/{chatId}/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private ChatService chatService;

    @GetMapping
    public ResponseEntity<Map<String, Object>> getMessagesByChatId(@PathVariable String chatId) {
        try {
            // Verifica se la chat esiste
            Optional<Chat> chat = chatService.getChatById(chatId);
            if (chat.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Chat non trovata");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }else{
                List<Message> messages = messageService.getMessages(chatId);
                Map<String, Object> response = new HashMap<>();
                response.put("messages", messages);
                return ResponseEntity.ok(response);
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nel recupero dei messaggi");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> sendMessage(@PathVariable String chatId, @RequestBody Map<String, Object> messageData) {
        try {
            // Verifica se la chat esiste
            Optional<Chat> chat = chatService.getChatById(chatId);
            if (chat.isEmpty()) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Chat non trovata");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(errorResponse);
            }

            // Verifica dei dati necessari
            if (messageData.get("content") == null) {
                Map<String, Object> errorResponse = new HashMap<>();
                errorResponse.put("error", "Contenuto del messaggio mancante");
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorResponse);
            }

            // Imposta il mittente come l'utente corrente se non specificato
            String sender = messageData.containsKey("sender") ? (String) messageData.get("sender") : "currentUser";
            String content = (String) messageData.get("content");

            Optional<Message> newMessage = messageService.addMessage(chatId, sender, content);
            if (newMessage.isPresent()) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", newMessage);
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            } else {
                throw new Exception();
            }
        } catch (Exception e) {
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Si è verificato un errore nell'invio del messaggio");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }
}