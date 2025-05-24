package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.MessageService;
import com.google.firebase.database.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * Controller for handling message-related API requests.
 * This includes retrieving messages, sending, updating, and deleting messages.
 */
@RestController
@RequestMapping("/api/messages")
public class MessageController {

    @Autowired
    private MessageService messageService; // Service for message handling

    @Autowired
    private FirebaseService firebaseService; // Service for Firebase interactions

    @Autowired
    private SimpMessagingTemplate messagingTemplate; // For sending real-time WebSocket messages

    @Autowired
    private ChatService chatService; // Service for chat-related logic

    /**
     * Initializes the Firebase listener to listen for new messages added to a chat.
     * Once a new message is added, it sends the message to the corresponding topic.
     */
    @PostConstruct
    public void initFirebaseMessageListener() {
        DatabaseReference chatsRef = firebaseService.getDatabaseReference().child("chats");

        // Listen for changes in the 'chats' node
        chatsRef.addChildEventListener(new ChildEventListener() {
            @Override
            public void onChildAdded(DataSnapshot chatSnapshot, String previousChildName) {
                String chatId = chatSnapshot.getKey();
                DatabaseReference messagesRef = chatSnapshot.getRef().child("messages");

                // Listen for changes in the 'messages' node for each chat
                messagesRef.addChildEventListener(new ChildEventListener() {
                    @Override
                    public void onChildAdded(DataSnapshot snapshot, String previousChildName) {
                        sendMessages(chatId); // Send updated messages when a new message is added
                    }

                    @Override
                    public void onChildChanged(DataSnapshot snapshot, String previousChildName) {
                        sendMessages(chatId); // Send updated messages when a message is changed
                    }

                    @Override
                    public void onChildRemoved(DataSnapshot snapshot) {
                        sendMessages(chatId); // Send updated messages when a message is removed
                    }

                    @Override
                    public void onChildMoved(DataSnapshot snapshot, String previousChildName) {}

                    @Override
                    public void onCancelled(DatabaseError error) {
                        System.err.println("Error on chats/" + chatId + "/messages: " + error.getMessage());
                    }

                    private void sendMessages(String chatId) {
                        // Retrieve and send messages to the WebSocket topic
                        messageService.getMessagesByChatId(chatId).thenAccept(messages -> {
                            messagingTemplate.convertAndSend("/topic/messages/" + chatId, messages);
                        });
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
        });
    }

    @Operation(
            summary = "Retrieve all messages for a specific chat",
            description = "Returns a list of all messages associated with the specified chat.",
            parameters = {
                    @Parameter(name = "chatId", description = "ID of the chat", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Messages retrieved successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{chatId}")
    public List<Message> getMessagesByChatId(@PathVariable String chatId) throws ExecutionException, InterruptedException {
        return messageService.getMessagesByChatId(chatId).get(); // Retrieves and returns messages
    }

    @Operation(
            summary = "Send a new message to a chat",
            description = "Sends a new message to a specific chat.",
            parameters = {
                    @Parameter(name = "chatId", description = "ID of the chat", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "payload", description = "Message content including content, sender, and optional image", required = true, in = ParameterIn.DEFAULT)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Message sent successfully"),
            @ApiResponse(responseCode = "400", description = "Missing or invalid content or sender"),
            @ApiResponse(responseCode = "500", description = "Internal server error while sending the message")
    })
    @PostMapping("/{chatId}/send")
    public ResponseEntity<?> sendMessage(
            @PathVariable String chatId,
            @RequestBody Map<String, Object> payload) {

        String content = (String) payload.get("content");
        String sender = (String) payload.get("sender");
        String image = (String) payload.getOrDefault("image", null); // Image can be null

        if (content == null || sender == null) {
            return ResponseEntity.badRequest().body("Missing content or sender"); // Bad request if content or sender is missing
        }

        // Create a new message and set its properties
        Message newMessage = new Message();
        newMessage.setContent(content);
        newMessage.setSender(sender);
        newMessage.setTimestamp(java.time.LocalDateTime.now().toString());
        newMessage.setRead(false);
        newMessage.setImage(image); // Set image if present

        try {
            Map<String, Object> result = messageService.sendMessage(chatId, newMessage).join();
            return ResponseEntity.ok(result); // Return success response
        } catch (Exception ex) {
            ex.printStackTrace();
            return ResponseEntity.status(500).body("Error sending message"); // Return error response
        }
    }


    @Operation(
            summary = "Update an existing message",
            description = "Updates the content of an existing message in a chat.",
            parameters = {
                    @Parameter(name = "chatId", description = "ID of the chat", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "messageId", description = "ID of the message to update", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "payload", description = "New content for the message", required = true, in = ParameterIn.DEFAULT)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Message updated successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PutMapping("/{chatId}/update/{messageId}")
    public CompletableFuture<ResponseEntity<Void>> updateMessage(
            @PathVariable String chatId,
            @PathVariable String messageId,
            @RequestBody Map<String, String> payload) {

        String newContent = payload.get("content");
        return chatService.updateMessage(chatId, messageId, newContent)
                .thenApply(v -> ResponseEntity.ok().build()); // Return success response
    }


    @Operation(
            summary = "Delete a specific message",
            description = "Deletes a specific message from a chat.",
            parameters = {
                    @Parameter(name = "chatId", description = "ID of the chat", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "messageId", description = "ID of the message to delete", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Message deleted successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @DeleteMapping("/{chatId}/delete/{messageId}")
    public CompletableFuture<ResponseEntity<Void>> deleteMessage(
            @PathVariable String chatId,
            @PathVariable String messageId) {

        return chatService.deleteMessage(chatId, messageId)
                .thenApply(v -> ResponseEntity.ok().build()); // Return success response
    }

    @Operation(
            summary = "Retrieve a specific message by ID",
            description = "Retrieves a specific message by chat ID and message ID.",
            parameters = {
                    @Parameter(name = "chatId", description = "ID of the chat", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "messageId", description = "ID of the message", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Message retrieved successfully"),
            @ApiResponse(responseCode = "404", description = "Message not found"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{chatId}/messages/{messageId}")
    public CompletableFuture<ResponseEntity<Message>> getMessageById(
            @PathVariable String chatId,
            @PathVariable String messageId) {
        return messageService.getMessageById(chatId, messageId)
                .thenApply(message -> {
                    if (message == null) return ResponseEntity.notFound().build(); // Return 404 if message not found
                    return ResponseEntity.ok(message); // Return the message if found
                });
    }

    /**
     * Constructor for MessageController that logs the initialization.
     */
    public MessageController() {
        System.out.println("[LOG - MessageController] initialized");
    }
}
