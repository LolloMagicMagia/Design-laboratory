package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.dto.response.UserResponse;
import com.example.bicoChat_backend.model.User;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.UserService;
import com.google.firebase.database.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.annotation.PostConstruct;
import java.io.IOException;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Initialize the listener for Firebase user data changes.
     * When user data changes in Firebase, it updates all connected clients with the latest user data.
     */
    @PostConstruct
    public void initFirebaseUserListener() {
        firebaseService.listenToUsersChanges(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                // Fetch all users and send updated user list to all connected clients via WebSocket
                userService.getAllUsers().thenAccept(users -> {
                    messagingTemplate.convertAndSend("/topic/users", users);
                });
            }

            @Override
            public void onCancelled(DatabaseError error) {
                System.err.println("Error on /users: " + error.getMessage());
            }
        });
    }


    @Operation(
            summary = "Retrieve all users",
            description = "Returns a list of all users in the system."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of users retrieved successfully"),
            @ApiResponse(responseCode = "500", description = "Execution error")
    })
    @GetMapping
    public Object getAllUsers() throws ExecutionException, InterruptedException {
        return userService.getAllUsers().get();
    }

    @Operation(
            summary = "Retrieve user by ID",
            description = "Returns a specific user identified by their unique user ID.",
            parameters = {
                    @Parameter(name = "uid", description = "Unique user ID", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User found and returned"),
            @ApiResponse(responseCode = "404", description = "User not found"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{uid}")
    public ResponseEntity<?> getUserById(@PathVariable String uid) throws ExecutionException, InterruptedException {
        Optional<UserResponse> userOpt = userService.getUserById(uid).get();
        return userOpt
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "User not found")));
    }

    @Operation(
            summary = "Update user status",
            description = "Updates the status of a user, e.g., online, offline, busy.",
            parameters = {
                    @Parameter(name = "uid", description = "Unique user ID", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "body", description = "Status payload, e.g. {\"status\": \"online\"}", required = true, in = ParameterIn.DEFAULT)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Status updated successfully"),
            @ApiResponse(responseCode = "400", description = "Invalid input data"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PutMapping("/{uid}/status")
    public void updateUserStatus(@PathVariable String uid, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        userService.updateUserStatus(uid, status);
    }

    @Operation(
            summary = "Mark chat as read",
            description = "Marks a chat as read and notifies all connected clients.",
            parameters = {
                    @Parameter(name = "chatId", description = "Unique chat ID", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Chat marked as read successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PutMapping("/markChatAsRead/{chatId}")
    public void markChatAsRead(@PathVariable String chatId) {
        userService.markChatAsRead(chatId)
                .thenAccept(aVoid -> {
                    // After updating Firebase, send the updated user list to all connected clients
                    userService.getAllUsers().thenAccept(users -> {
                        messagingTemplate.convertAndSend("/topic/users", users);
                    });
                })
                .exceptionally(ex -> {
                    System.err.println("Error marking chat as read for chat ID " + chatId);
                    return null;
                });
    }

    @Operation(
            summary = "Update or create user profile",
            description = "Updates or creates a user profile with the provided details.",
            parameters = {
                    @Parameter(name = "userId", description = "User's unique ID", required = true, in = ParameterIn.QUERY),
                    @Parameter(name = "firstName", description = "User's first name", required = true, in = ParameterIn.QUERY),
                    @Parameter(name = "lastName", description = "User's last name", required = true, in = ParameterIn.QUERY),
                    @Parameter(name = "avatar", description = "User's avatar in Base64 format (optional)", required = false, in = ParameterIn.QUERY)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "User profile updated successfully"),
            @ApiResponse(responseCode = "500", description = "Error updating profile")
    })
    @PostMapping("/updateProfile")
    public ResponseEntity<String> updateProfile(
            @RequestParam String userId,
            @RequestParam String firstName,
            @RequestParam String lastName,
            @RequestParam(required = false) String avatar) {

        try {
            userService.updateUserProfile(userId, firstName, lastName, avatar);
            return ResponseEntity.ok("User profile updated successfully!");
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Error updating profile: " + e.getMessage());
        }
    }

    @Operation(
            summary = "Retrieve all users for chat list",
            description = "Returns a list of users formatted for the chat interface."
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Users list for chat returned successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/chatlist")
    public ResponseEntity<Map<String, Object>> getAllUsersForChatList() {
        try {
            Map<String, Object> result = userService.getAllUsersForChatList().get(); // Blocks until the task completes
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @Operation(
            summary = "Update user bio",
            description = "Updates the biography of a specific user.",
            parameters = {
                    @Parameter(name = "uid", description = "Unique user ID", required = true, in = ParameterIn.PATH),
                    @Parameter(name = "body", description = "Payload containing new bio", required = true, in = ParameterIn.DEFAULT)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Bio updated successfully"),
            @ApiResponse(responseCode = "500", description = "Error updating bio")
    })
    @PatchMapping("/{uid}/bio")
    public CompletableFuture<ResponseEntity<String>> updateUserBio(@PathVariable String uid, @RequestBody Map<String, String> body) {
        String bio = body.get("bio");
        return userService.updateUserBio(uid, bio)
                .thenApply(v -> ResponseEntity.ok("Bio updated successfully"))
                .exceptionally(e -> ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error updating bio: " + e.getMessage()));
    }

    /**
     * Constructor for UserController that logs the initialization.
     */
    public UserController() {
        System.out.println("[LOG - UserController] initialized");
    }
}
