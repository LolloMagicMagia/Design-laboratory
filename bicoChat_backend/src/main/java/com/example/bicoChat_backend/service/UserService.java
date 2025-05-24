package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.UserResponse;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.GenericTypeIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class UserService {

    private static final String USERS_PATH = "users";

    @Autowired
    private FirebaseService firebaseService;

    /**
     * Constructor for UserService class.
     *
     * @param firebaseService FirebaseService instance used for database operations
     */
    @Autowired
    public UserService(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    /**
     * Retrieves a user by their unique ID.
     *
     * @param userId The ID of the user to fetch
     * @return A CompletableFuture with an Optional of UserResponse
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
     * Retrieves all users from the database.
     *
     * @return A CompletableFuture with a list of UserResponse
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
     * Updates the status of a user.
     *
     * @param userId The ID of the user to update
     * @param status The new status for the user
     * @return A CompletableFuture indicating the success or failure of the operation
     */
    public CompletableFuture<Void> updateUserStatus(String userId, String status) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status);
        return firebaseService.update(USERS_PATH + "/" + userId, updates);
    }

    /**
     * Adds a new user to the Firebase database.
     *
     * @param userId The ID of the user to add
     * @param user The user data to save
     * @return A CompletableFuture indicating the success or failure of the operation
     */
    public CompletableFuture<Void> addUser(String userId, User user) {
        return firebaseService.set(USERS_PATH + "/" + userId, user);
    }

    /**
     * Deletes a user from the Firebase database.
     *
     * @param userId The ID of the user to delete
     * @return A CompletableFuture indicating the success or failure of the operation
     */
    public CompletableFuture<Void> deleteUser(String userId) {
        return firebaseService.delete(USERS_PATH + "/" + userId);
    }

    /**
     * Retrieves all chats associated with a user.
     *
     * @param userId The ID of the user whose chats are to be fetched
     * @return A CompletableFuture containing a map of chat IDs to ChatInfo
     */
    public CompletableFuture<Map<String, User.ChatInfo>> getUserChats(String userId) {
        return firebaseService.getWithTypeIndicator(USERS_PATH + "/" + userId + "/chatUser", new GenericTypeIndicator<Map<String, User.ChatInfo>>() {})
                .thenApply(chats -> chats != null ? chats : new HashMap<>());
    }

    /**
     * Marks a chat as read for all participants.
     *
     * @param chatId The ID of the chat to mark as read
     * @return A CompletableFuture indicating the success or failure of the operation
     */
    public CompletableFuture<Void> markChatAsRead(String chatId) {
        // Retrieve the participants of the chat
        return firebaseService.getWithTypeIndicator("chats/" + chatId + "/participants", new GenericTypeIndicator<List<String>>() {})
                .thenCompose(participants -> {
                    System.out.println("Participants for chat " + chatId + ": " + participants);
                    if (participants == null || participants.isEmpty()) {
                        throw new RuntimeException("No participants found for chat " + chatId);
                    }

                    // Create updates for all participants (set unreadCount to 0)
                    Map<String, Object> updates = new HashMap<>();
                    for (String participantId : participants) {
                        String participantPath = USERS_PATH + "/" + participantId + "/chatUser/" + chatId + "/unreadCount";
                        updates.put(participantPath, 0);  // Set unreadCount to 0 for all participants
                    }

                    // Also update the chat messages, setting "read" to true
                    return firebaseService.getWithTypeIndicator("chats/" + chatId + "/messages", new GenericTypeIndicator<Map<String, Map<String, Object>>>() {})
                            .thenCompose(messages -> {
                                Map<String, Object> messagesUpdates = new HashMap<>();
                                if (messages != null) {
                                    messages.forEach((messageId, messageData) -> {
                                        if (messageData != null && !Boolean.TRUE.equals(messageData.get("read"))) {
                                            messagesUpdates.put("chats/" + chatId + "/messages/" + messageId + "/read", true);
                                        }
                                    });
                                }
                                updates.putAll(messagesUpdates);  // Add updates to messages

                                // Apply all updates in a single operation
                                return firebaseService.updateMulti(updates);
                            });
                });
    }

    /**
     * Retrieves all users for generating a chat list.
     *
     * @return A CompletableFuture containing a map of all users
     */
    public CompletableFuture<Map<String, Object>> getAllUsersForChatList() {
        return firebaseService.getWithTypeIndicator("users", new GenericTypeIndicator<>() {});
    }

    /**
     * Updates the bio of a user.
     *
     * @param uid The ID of the user to update
     * @param bio The new bio for the user
     * @return A CompletableFuture indicating the success or failure of the operation
     */
    public CompletableFuture<Void> updateUserBio(String uid, String bio) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("bio", bio);
        return firebaseService.update("users/" + uid, updates);
    }

    /**
     * Updates the profile of a user, including their first name, last name, and avatar.
     *
     * @param userId The ID of the user to update
     * @param firstName The user's first name
     * @param lastName The user's last name
     * @param avatar The user's avatar
     */
    public void updateUserProfile(String userId, String firstName, String lastName, String avatar) {
        String username = firstName + " " + lastName;

        firebaseService.get("users/" + userId, User.class).thenAccept(existingUser -> {
            if (existingUser != null) {
                existingUser.setFirstName(firstName);
                existingUser.setLastName(lastName);
                existingUser.setUsername(username);
                existingUser.setAvatar(avatar);

                firebaseService.set("users/" + userId, existingUser);

                // Retrieve all user's chats
                firebaseService.getWithTypeIndicator("users/" + userId + "/chatUser", new GenericTypeIndicator<Map<String, User.ChatInfo>>() {})
                        .thenAccept(chatUserMap -> {
                            if (chatUserMap != null) {
                                chatUserMap.keySet().forEach(chatId -> {

                                    // For each chat, check if it's an individual chat
                                    firebaseService.get("chats/" + chatId + "/type", String.class)
                                            .thenAccept(chatType -> {
                                                if (!"group".equals(chatType)) {
                                                    // Retrieve the participants of the chat
                                                    firebaseService.getWithTypeIndicator("chats/" + chatId + "/participants", new GenericTypeIndicator<List<String>>() {})
                                                            .thenAccept(participants -> {
                                                                if (participants != null) {
                                                                    for (String otherUid : participants) {
                                                                        if (!otherUid.equals(userId)) {
                                                                            String path = "users/" + otherUid + "/chatUser/" + chatId + "/title";
                                                                            firebaseService.set(path, username);
                                                                        }
                                                                    }
                                                                }
                                                            });
                                                }
                                            });
                                });
                            }
                        });
            }
        });
    }

    public CompletableFuture<Void> hideChat(String userId, String chatId, String pin) {
        return getUserById(userId)
                .thenCompose(optionalUser -> {
                    if (optionalUser.isEmpty()) {
                        return CompletableFuture.failedFuture(new IllegalArgumentException("User not found"));
                    }
                    User user = optionalUser.get().getUser();
                    Map<String, Map<String, Object>> hiddenChats = user.getHiddenChats();
                    if (hiddenChats == null) hiddenChats = new HashMap<>();
                    Map<String, Object> chatPinInfo = new HashMap<>();
                    chatPinInfo.put("pin", pin);
                    hiddenChats.put(chatId, chatPinInfo);
                    user.setHiddenChats(hiddenChats);
                    return firebaseService.set(USERS_PATH + "/" + userId, user);
                });
    }

    public CompletableFuture<Void> unhideChat(String userId, String chatId) {
        return getUserById(userId)
                .thenCompose(optionalUser -> {
                    if (optionalUser.isEmpty()) {
                        return CompletableFuture.failedFuture(new IllegalArgumentException("User not found"));
                    }
                    User user = optionalUser.get().getUser();
                    Map<String, Map<String, Object>> hiddenChats = user.getHiddenChats();
                    if (hiddenChats != null && hiddenChats.containsKey(chatId)) {
                        hiddenChats.remove(chatId);
                        user.setHiddenChats(hiddenChats);
                        return firebaseService.set(USERS_PATH + "/" + userId, user);
                    }
                    return CompletableFuture.completedFuture(null);
                });
    }

    public CompletableFuture<Boolean> verifyHiddenChatPin(String userId, String chatId, String pin) {
        return getUserById(userId)
                .thenApply(optionalUser -> {
                    if (optionalUser.isEmpty()) return false;
                    User user = optionalUser.get().getUser();
                    Map<String, Map<String, Object>> hiddenChats = user.getHiddenChats();
                    if (hiddenChats != null && hiddenChats.containsKey(chatId)) {
                        Object storedPin = hiddenChats.get(chatId).get("pin");
                        return storedPin != null && storedPin.toString().equals(pin);
                    }
                    return false;
                });
    }

}
