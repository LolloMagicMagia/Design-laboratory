package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.UserResponse;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.GenericTypeIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class UserService {

    private static final String USERS_PATH = "users";

    @Autowired
    private FirebaseService firebaseService;

    /**
     * Retrieves a specific user from the Firebase Realtime Database.
     * @param userId ID of the user
     * @return CompletableFuture with the found user or an empty Optional
     */
    public CompletableFuture<Optional<UserResponse>> getUserById(String userId) {
        return firebaseService.get(USERS_PATH + "/" + userId, User.class)
                .thenApply(user -> {
                    if (user != null) {
                        return Optional.of(new UserResponse(userId, user));
                    }
                    return Optional.empty();
                });
    }

    /**
     * Retrieves all users from the Firebase Realtime Database.
     * @return CompletableFuture with the list of users
     */
    public CompletableFuture<List<UserResponse>> getAllUsers() {
        GenericTypeIndicator<Map<String, User>> typeIndicator = new GenericTypeIndicator<Map<String, User>>() {};

        return firebaseService.getWithTypeIndicator(USERS_PATH, typeIndicator)
                .thenApply(usersMap -> {
                    List<UserResponse> userResponses = new ArrayList<>();
                    if (usersMap != null) {
                        for (Map.Entry<String, User> entry : usersMap.entrySet()) {
                            String userId = entry.getKey();
                            User user = entry.getValue();
                            userResponses.add(new UserResponse(userId, user));
                        }
                    }
                    return userResponses;
                });
    }

    /**
     * Retrieves the current user, returning a default value if it does not exist.
     * @return CompletableFuture with the current user
     */
    public CompletableFuture<UserResponse> getCurrentUser() {
        Map<String, User.ChatInfo> defaultChats = new HashMap<>();
        defaultChats.put("welcome", new User.ChatInfo(
                "Benvenuto su BicoChat!",
                "System",
                LocalDateTime.now().toString(),
                0
        ));

        return getUserById("currentUser").thenApply(user -> user.orElse(
                new UserResponse("currentUser", new User("Tu", "online", defaultChats))
        ));
    }

    /**
     * Updates a user's status in the Firebase Realtime Database.
     * @param userId ID of the user
     * @param status New status (e.g., "online", "offline")
     * @return CompletableFuture that completes when the operation is finished
     */
    public CompletableFuture<Void> updateUserStatus(String userId, String status) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status);
        return firebaseService.update(USERS_PATH + "/" + userId, updates);
    }

    /**
     * Adds a new user to the Firebase Realtime Database.
     * @param userId ID of the user
     * @param user User to add
     * @return CompletableFuture that completes when the operation is finished
     */
    public CompletableFuture<Void> addUser(String userId, User user) {
        return firebaseService.set(USERS_PATH + "/" + userId, user);
    }

    /**
     * Deletes a user from the Firebase Realtime Database.
     * @param userId ID of the user to delete
     * @return CompletableFuture that completes when the operation is finished
     */
    public CompletableFuture<Void> deleteUser(String userId) {
        return firebaseService.delete(USERS_PATH + "/" + userId);
    }
}
