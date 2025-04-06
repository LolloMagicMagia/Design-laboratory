package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.FirebaseService;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/chats")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostConstruct
    public void initFirebaseChatListener() {
        firebaseService.getWithTypeIndicator("/chats", new GenericTypeIndicator<Map<String, Chat>>() {})
                .thenAccept(chatsMap -> {
                    firebaseService.getDatabaseReference().child("chats")
                            .addValueEventListener(new ValueEventListener() {
                                @Override
                                public void onDataChange(DataSnapshot snapshot) {
                                    chatService.getAllChats().thenAccept(chats -> {
                                        messagingTemplate.convertAndSend("/topic/chats", chats);
                                    });
                                }

                                @Override
                                public void onCancelled(DatabaseError error) {
                                    System.err.println("Error on /chats: " + error.getMessage());
                                }
                            });
                });
    }

    @GetMapping
    public List<ChatResponse> getAllChats() throws ExecutionException, InterruptedException {
        return chatService.getAllChats().get();
    }
}
