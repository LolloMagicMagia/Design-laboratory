package com.example.bicoChat_backend;

import com.example.bicoChat_backend.controller.MessageController;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.MessageService;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.ChildEventListener;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class MessageControllerTest {

    @Mock
    private MessageService messageService;

    @Mock
    private FirebaseService firebaseService;

    @Mock
    private ChatService chatService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @Mock
    private DatabaseReference databaseReference;

    @Mock
    private DatabaseReference chatsRef;

    @Mock
    private DataSnapshot chatSnapshot;

    @InjectMocks
    private MessageController messageController;

    private final String CHAT_ID = "chat123";
    private final String MESSAGE_ID = "msg123";
    private final String SENDER = "user1";
    private final String CONTENT = "Hello, world!";

    @BeforeEach
    void setUp() {
        when(firebaseService.getDatabaseReference()).thenReturn(databaseReference);
        when(databaseReference.child("chats")).thenReturn(chatsRef);
    }

    @Test
    void testInitFirebaseMessageListener() {
        // Since this method is called via @PostConstruct and mostly sets up listeners,
        // we'll verify that the Firebase reference was accessed correctly
        messageController.initFirebaseMessageListener();

        verify(firebaseService).getDatabaseReference();
        verify(databaseReference).child("chats");
        verify(chatsRef).addChildEventListener(any(ChildEventListener.class));
    }
}