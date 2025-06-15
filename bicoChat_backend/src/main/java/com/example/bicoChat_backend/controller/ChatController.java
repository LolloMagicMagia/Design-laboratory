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
            summary = "Create group chat",
            description = "Creates a new group chat with the specified members and metadata.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Request payload containing group chat creation details",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group chat created successfully"),
            @ApiResponse(responseCode = "500", description = "Error occurred while creating the group chat")
    })
    @PostMapping("/createGroup")
    public ResponseEntity<String> createGroupChat(@RequestBody CreateGroupRequest request) {
        try {
            chatService.createGroupChat(request);
            return ResponseEntity.ok("Chat di gruppo creata con successo.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore nella creazione della chat di gruppo: " + e.getMessage());
        }
    }

    @Operation(
            summary = "Update group chat information",
            description = "Updates metadata of a group chat such as name or image.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Payload containing updated group chat information",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group updated successfully"),
            @ApiResponse(responseCode = "403", description = "You do not have permission to modify the group"),
            @ApiResponse(responseCode = "500", description = "Error occurred while updating the group")
    })
    @PatchMapping("/{chatId}")
    public ResponseEntity<String> updateGroupInfo(
            @PathVariable String chatId,
            @RequestBody GroupUpdateRequest request
    ) {
        try {
            chatService.updateGroupInfo(chatId, request);
            return ResponseEntity.ok("Gruppo aggiornato con successo.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non hai i permessi per modificare il gruppo.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore aggiornamento gruppo.");
        }
    }

    @Operation(
            summary = "Update user role in a group chat",
            description = "Updates the role of a user within a specific group chat, for example promoting a member to admin.",
            parameters = {
                    @Parameter(
                            name = "chatId",
                            description = "The unique identifier of the group chat",
                            required = true,
                            in = ParameterIn.PATH
                    )
            },
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Request payload containing the target user and the new role to assign",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Role updated successfully"),
            @ApiResponse(responseCode = "403", description = "Permission denied to update role"),
            @ApiResponse(responseCode = "500", description = "Internal server error while updating role")
    })
    @PatchMapping("/{chatId}/role")
    public ResponseEntity<String> updateUserRole(
            @PathVariable String chatId,
            @RequestBody RoleUpdateRequest request
    ) {
        try {
            chatService.updateUserRole(chatId, request);
            return ResponseEntity.ok("Ruolo aggiornato.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Permesso negato.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore aggiornamento ruolo.");
        }
    }

    @Operation(
            summary = "Remove user from group chat",
            description = "Removes a specified user from a group chat if the requester has the necessary permissions.",
            parameters = {
                    @Parameter(
                            name = "chatId",
                            description = "The ID of the group chat",
                            required = true,
                            in = ParameterIn.PATH
                    ),
                    @Parameter(
                            name = "targetUserId",
                            description = "The ID of the user to be removed from the group",
                            required = true,
                            in = ParameterIn.PATH
                    ),
                    @Parameter(
                            name = "requesterId",
                            description = "The ID of the user requesting the removal",
                            required = true,
                            in = ParameterIn.QUERY
                    )
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User successfully removed from the group"),
            @ApiResponse(responseCode = "403", description = "Permission denied to remove user"),
            @ApiResponse(responseCode = "500", description = "Internal server error during user removal")
    })
    @DeleteMapping("/{chatId}/user/{targetUserId}")
    public ResponseEntity<String> removeUserFromGroup(
            @PathVariable String chatId,
            @PathVariable String targetUserId,
            @RequestParam String requesterId
    ) {
        try {
            chatService.removeUserFromGroup(chatId, targetUserId, requesterId);
            return ResponseEntity.ok("Utente rimosso con successo.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Permesso negato.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore durante la rimozione dell'utente.");
        }
    }

    @Operation(
            summary = "Delete group chat",
            description = "Deletes an entire group chat if the requester has the necessary permissions.",
            parameters = {
                    @Parameter(
                            name = "chatId",
                            description = "The ID of the group chat to delete",
                            required = true,
                            in = ParameterIn.PATH
                    ),
                    @Parameter(
                            name = "requesterId",
                            description = "The ID of the user requesting the deletion",
                            required = true,
                            in = ParameterIn.QUERY
                    )
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Group deleted successfully"),
            @ApiResponse(responseCode = "403", description = "Not authorized to delete the group"),
            @ApiResponse(responseCode = "500", description = "Internal server error during group deletion")
    })
    @DeleteMapping("/group/{chatId}")
    public ResponseEntity<String> deleteGroupChat(
            @PathVariable String chatId,
            @RequestParam String requesterId
    ) {
        try {
            chatService.deleteGroupChat(chatId, requesterId);
            return ResponseEntity.ok("Gruppo eliminato.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Non sei autorizzato a eliminare il gruppo.");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore durante l'eliminazione del gruppo.");
        }
    }

    @Operation(
            summary = "Add user to group chat",
            description = "Adds a user to a group chat if the requester has the necessary permissions.",
            parameters = {
                    @Parameter(
                            name = "chatId",
                            description = "ID of the group chat",
                            required = true,
                            in = ParameterIn.PATH
                    ),
                    @Parameter(
                            name = "userId",
                            description = "ID of the user to be added to the group",
                            required = true,
                            in = ParameterIn.PATH
                    ),
                    @Parameter(
                            name = "requesterId",
                            description = "ID of the user performing the add operation",
                            required = true,
                            in = ParameterIn.QUERY
                    )
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User successfully added to the group"),
            @ApiResponse(responseCode = "400", description = "Invalid request, e.g. user cannot be added"),
            @ApiResponse(responseCode = "403", description = "Permission denied"),
            @ApiResponse(responseCode = "500", description = "Internal server error during user addition")
    })
    @PostMapping("/{chatId}/add-user/{userId}")
    public ResponseEntity<String> addUserToGroup(
            @PathVariable String chatId,
            @PathVariable String userId,
            @RequestParam String requesterId
    ) {
        try {
            chatService.addUserToGroup(chatId, userId, requesterId);
            return ResponseEntity.ok("Utente aggiunto al gruppo.");
        } catch (SecurityException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body("Permesso negato.");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Errore durante l'aggiunta al gruppo.");
        }
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
            summary = "Hide chat",
            description = "Hides a chat for a user, secured by a PIN."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Chat hidden successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error while hiding chat")
    })
    @PostMapping("/{chatId}/hide")
    public CompletableFuture<ResponseEntity<Object>> hideChat(
            @PathVariable String chatId,
            @RequestParam String userId,
            @RequestParam String pin) {
        return userService.hideChat(userId, chatId, pin)
                .thenApply(v -> ResponseEntity.ok().build())
                .exceptionally(e -> new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR));
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
