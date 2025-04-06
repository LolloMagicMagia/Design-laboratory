package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.MessageService;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostConstruct
    public void initFirebaseMessageListener() {
        DatabaseReference chatsRef = firebaseService.getDatabaseReference().child("chats");

        chatsRef.addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(DataSnapshot chatSnapshot, String previousChildName) {
                String chatId = chatSnapshot.getKey();
                DatabaseReference messagesRef = chatSnapshot.getRef().child("messages");
                messagesRef.addChildEventListener(new ChildEventListener() {
                    @Override
                    public void onChildAdded(DataSnapshot snapshot, String previousChildName) {
                        sendMessages(chatId);
                    }

                    @Override
                    public void onChildChanged(DataSnapshot snapshot, String previousChildName) {
                        sendMessages(chatId);
                    }

                    @Override
                    public void onChildRemoved(DataSnapshot snapshot) {
                        sendMessages(chatId);
                    }

                    @Override
                    public void onChildMoved(DataSnapshot snapshot, String previousChildName) {}

                    @Override
                    public void onCancelled(DatabaseError error) {
                        System.err.println("Error on chats/" + chatId + "/messages: " + error.getMessage());
                    }
                });
            }

            @Override
            public void onChildChanged(DataSnapshot snapshot, String previousChildName) {}

            @Override
            public void onChildRemoved(DataSnapshot snapshot) {}

            @Override
            public void onChildMoved(DataSnapshot snapshot, String previousChildName) {}

            @Override
            public void onCancelled(DatabaseError error) {
                System.err.println("Error on /chats: " + error.getMessage());
            }

            private void sendMessages(String chatId) {
                messageService.getMessagesByChatId(chatId).thenAccept(messages -> {
                    //System.out.println("Sending messages to topic: /topic/messages/" + chatId + " -> " + messages);
                    messagingTemplate.convertAndSend("/topic/messages/" + chatId, messages);
                });
            }
        });
    }


    @GetMapping("/{chatId}")
    public List<Message> getMessagesByChatId(@PathVariable String chatId) throws ExecutionException, InterruptedException {
        return messageService.getMessagesByChatId(chatId).get();
    }

}
