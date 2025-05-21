package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.dto.request.CreateGroupRequest;
import com.example.bicoChat_backend.dto.request.GroupUpdateRequest;
import com.example.bicoChat_backend.dto.request.RoleUpdateRequest;
import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.UserService;
import com.google.firebase.database.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;


import javax.annotation.PostConstruct;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

/**
 * REST controller for managing chat functionalities including individual and group chats.
 * Provides endpoints to create, update, delete chats and manage group members and roles.
 */
@RestController
@RequestMapping("/api/chats")
@Tag(name = "Chat Controller", description = "Management of individual and group chats")
public class ChatController {

    @Autowired
    private ChatService chatService;

    @Autowired
    private UserService userService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;
    /**
     * Initializes a Firebase listener for chat updates.
     * On any change, it sends updated chat list to clients via WebSocket (/topic/chats).
     */
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

    @Operation(summary = "Get all the chats")
    @ApiResponse(responseCode = "200", description = "List of chats obteined with success")
    @GetMapping
    public List<ChatResponse> getAllChats() throws ExecutionException, InterruptedException {
        return chatService.getAllChats().get();
    }


    @Operation(summary = "Retrieve a specific chat by ID")
    @ApiResponse(responseCode = "200", description = "Chat Found")
    @ApiResponse(responseCode = "404", description = "Chat not Found")
    @GetMapping("/{chatId}")
    public ResponseEntity<ChatResponse> getChatById(@PathVariable String chatId) throws ExecutionException, InterruptedException {
        Optional<ChatResponse> chatResponse = chatService.getChatById(chatId).get();
        return chatResponse.map(ResponseEntity::ok).orElseGet(() -> ResponseEntity.notFound().build());
    }


    @Operation(
            summary = "Create individual chat",
            description = "Creates an individual chat between two users if it does not already exist.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Payload containing senderId, receiverId, and message",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chat created successfully or already exists"),
            @ApiResponse(responseCode = "400", description = "Missing parameters")
    })
    @PostMapping("/create-individual")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> createIndividualChat(
            @RequestBody Map<String, String> payload) {

        String user1Id = payload.get("senderId");
        String user2Id = payload.get("receiverId");
        String message = payload.get("message");

        if (user1Id == null || user2Id == null || message == null) {
            return CompletableFuture.completedFuture(ResponseEntity.badRequest().body(Map.of("error", "Missing parameters")));
        }

        return chatService.createIndividualChatIfNotExists(user1Id, user2Id, message)
                .thenApply(chatResponse -> {
                    Map<String, Object> response = new HashMap<>();
                    response.put("chatId", chatResponse.getId());
                    response.put("alreadyExists", false); // oppure metti true se rilevi duplicati
                    return ResponseEntity.ok(response);
                });
    }


    @Operation(
            summary = "Delete chat",
            description = "Deletes any chat (individual or group) by its ID."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chat deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Chat not found"),
            @ApiResponse(responseCode = "500", description = "Internal server error while deleting chat")
    })
    @Parameter(
            name = "chatId",
            description = "ID of the chat to delete",
            required = true,
            in = ParameterIn.PATH
    )
    @DeleteMapping("/{chatId}")
    public CompletableFuture<ResponseEntity<Void>> deleteChat(@PathVariable String chatId) {
        return chatService.deleteChat(chatId)
                .thenApply(v -> ResponseEntity.ok().build());
    }


    @Operation(
            summary = "Unhide chat",
            description = "Unhides a previously hidden chat for a user."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chat unhidden successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error while unhiding chat")
    })
    @PostMapping("/{chatId}/unhide")
    public CompletableFuture<ResponseEntity<Object>> unhideChat(
            @PathVariable String chatId,
            @RequestParam String userId) {
        return userService.unhideChat(userId, chatId)
                .thenApply(v -> ResponseEntity.ok().build())
                .exceptionally(e -> new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR));
    }

    @Operation(
            summary = "Verify PIN for hidden chat",
            description = "Verifies the PIN provided by a user to access a hidden chat."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "PIN verification result returned successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error while verifying PIN")
    })
    @GetMapping("/{chatId}/verify-pin")
    public CompletableFuture<ResponseEntity<Boolean>> verifyPin(
            @PathVariable String chatId,
            @RequestParam String userId,
            @RequestParam String pin) {
        return userService.verifyHiddenChatPin(userId, chatId, pin)
                .thenApply(ResponseEntity::ok)
                .exceptionally(e -> ResponseEntity.status(500).body(false));
    }



    /**
     * Constructor for ChatController that logs the initialization.
     */
    public ChatController() {
        System.out.println("[LOG - ChatController] initialized");
    }



}
