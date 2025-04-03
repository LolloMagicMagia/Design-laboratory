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
     * Recupera un utente specifico dal Firebase Realtime Database.
     * @param userId ID dell'utente
     * @return CompletableFuture con l'utente trovato o un Optional vuoto
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
     * Recupera tutti gli utenti dal Firebase Realtime Database.
     * @return CompletableFuture con la lista di utenti
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
     * Recupera l'utente corrente, se non esiste restituisce un valore di default.
     * @return CompletableFuture con l'utente corrente
     */
    public CompletableFuture<UserResponse> getCurrentUser() {
        Map<String, User.ChatInfo> defaultChats = new HashMap<>();
        defaultChats.put("welcome", new User.ChatInfo(
                "Benvenuto in BicoChat!",
                "Sistema",
                LocalDateTime.now().toString(),
                0
        ));

        return getUserById("currentUser").thenApply(user -> user.orElse(
                new UserResponse("currentUser", new User("Tu", "online", defaultChats))
        ));
    }

    /**
     * Aggiorna lo stato di un utente nel Firebase Realtime Database.
     * @param userId ID dell'utente
     * @param status Nuovo stato (es. "online", "offline")
     * @return CompletableFuture che si completa quando l'operazione è terminata
     */
    public CompletableFuture<Void> updateUserStatus(String userId, String status) {
        Map<String, Object> updates = new HashMap<>();
        updates.put("status", status);
        return firebaseService.update(USERS_PATH + "/" + userId, updates);
    }

    /**
     * Aggiunge un nuovo utente nel Firebase Realtime Database.
     * @param userId ID dell'utente
     * @param user Utente da aggiungere
     * @return CompletableFuture che si completa quando l'operazione è terminata
     */
    public CompletableFuture<Void> addUser(String userId, User user) {
        return firebaseService.set(USERS_PATH + "/" + userId, user);
    }

    /**
     * Elimina un utente dal Firebase Realtime Database.
     * @param userId ID dell'utente da eliminare
     * @return CompletableFuture che si completa quando l'operazione è terminata
     */
    public CompletableFuture<Void> deleteUser(String userId) {
        return firebaseService.delete(USERS_PATH + "/" + userId);
    }
}