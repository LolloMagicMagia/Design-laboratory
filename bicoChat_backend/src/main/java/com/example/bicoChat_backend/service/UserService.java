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

    public CompletableFuture<Optional<UserResponse>> getUserById(String userId) {
        return firebaseService.get(USERS_PATH + "/" + userId, User.class)
                .thenApply(user -> {
                    if (user != null) {
                        return Optional.of(new UserResponse(userId, user));
                    }
                    return Optional.empty();
                });
    }

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

    public CompletableFuture<UserResponse> getCurrentUser() {
        return getUserById("currentUser").thenCompose(userOpt -> {
            if (userOpt.isPresent()) {
                UserResponse userResponse = userOpt.get();
                return getUserChats(userResponse.getId()).thenApply(chats -> {
                    userResponse.getUser().setChatUser(chats);
                    return userResponse;
                });
            }

            // Se l'utente non esiste, restituiamo un utente di default con una chat di benvenuto
            Map<String, User.ChatInfo> defaultChats = new HashMap<>();
            //defaultChats.put("welcome", new User.ChatInfo()

            return CompletableFuture.completedFuture(new UserResponse("currentUser", new User("0", "test", "test", "test", "test")));
        });
    }


    public CompletableFuture<Void> updateUserStatus(String userId, String status) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status);
        return firebaseService.update(USERS_PATH + "/" + userId, updates);
    }

    public CompletableFuture<Void> addUser(String userId, User user) {
        return firebaseService.set(USERS_PATH + "/" + userId, user);
    }

    public CompletableFuture<Void> deleteUser(String userId) {
        return firebaseService.delete(USERS_PATH + "/" + userId);
    }

    public CompletableFuture<Map<String, User.ChatInfo>> getUserChats(String userId) {
        return firebaseService.getWithTypeIndicator(USERS_PATH + "/" + userId + "/chatUser", new GenericTypeIndicator<Map<String, User.ChatInfo>>() {})
                .thenApply(chats -> chats != null ? chats : new HashMap<>());
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
