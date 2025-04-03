package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.GenericTypeIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class ChatService {

    private static final String CHATS_PATH = "chats";
    private static final String USERS_PATH = "users";

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private UserService userService;

    /**
     * Recupera tutte le chat dal Firebase Realtime Database.
     * @return CompletableFuture con la lista di chat
     */
    public CompletableFuture<List<ChatResponse>> getAllChats() {
        GenericTypeIndicator<Map<String, Chat>> typeIndicator = new GenericTypeIndicator<Map<String, Chat>>() {};

        return firebaseService.getWithTypeIndicator(CHATS_PATH, typeIndicator)
                .thenApply(chatsMap -> {
                    List<ChatResponse> chatResponseList = new ArrayList<>();
                    if (chatsMap != null) {
                        for (Map.Entry<String, Chat> entry : chatsMap.entrySet()) {
                            chatResponseList.add(new ChatResponse(entry.getKey(), entry.getValue()));
                        }
                    }
                    return chatResponseList;
                });
    }

    /**
     * Recupera una chat specifica dal Firebase Realtime Database.
     * @param chatId ID della chat
     * @return CompletableFuture con la chat trovata o un Optional vuoto
     */
    public CompletableFuture<Optional<ChatResponse>> getChatById(String chatId) {
        return firebaseService.get(CHATS_PATH + "/" + chatId, Chat.class)
                .thenApply(chat -> {
                    if (chat != null) {
                        return Optional.of(new ChatResponse(chatId, chat));
                    }
                    return Optional.empty();
                });
    }

    /**
     * Crea una nuova chat nel Firebase Realtime Database.
     * @param chat Chat da creare
     * @return CompletableFuture con la chat creata
     */
    public CompletableFuture<ChatResponse> createChat(Chat chat) {
        String chatId = UUID.randomUUID().toString();

        return firebaseService.set(CHATS_PATH + "/" + chatId, chat)
                .thenApply(v -> {
                    // Aggiorna le referenze della chat nei profili utente
                    updateChatReferencesInUserProfiles(chatId, chat);
                    return new ChatResponse(chatId, chat);
                });
    }

    /**
     * Aggiorna le referenze della chat nei profili degli utenti partecipanti.
     * @param chatId ID della chat
     * @param chat Chat da referenziare
     */
    private void updateChatReferencesInUserProfiles(String chatId, Chat chat) {
        // Codice invariato
        for (String userId : chat.getParticipants()) {
            userService.getUserById(userId).thenAccept(optionalUser -> {
                optionalUser.ifPresent(userResponse -> {
                    User user = userResponse.getUser();

                    // Crea una ChatInfo per l'utente
                    User.ChatInfo chatInfo = new User.ChatInfo(
                            "", // Empty last message initially
                            chat.getName() != null ? chat.getName() : userId,
                            LocalDateTime.now().toString(),
                            0
                    );

                    // Aggiunge la chat alle chat dell'utente
                    Map<String, User.ChatInfo> userChats = user.getChatUser();
                    if (userChats == null) {
                        userChats = new HashMap<>();
                    }
                    userChats.put(chatId, chatInfo);
                    user.setChatUser(userChats);

                    // Aggiornamento dell'utente su Firebase
                    firebaseService.set(USERS_PATH + "/" + userId, user);
                });
            });
        }
    }

    /**
     * Aggiunge un messaggio a una chat esistente.
     * @param chatId ID della chat
     * @param message Messaggio da aggiungere
     * @return CompletableFuture con il messaggio aggiunto e il suo ID
     */
    public CompletableFuture<Map.Entry<String, Message>> addMessage(String chatId, Message message) {
        String messageId = UUID.randomUUID().toString();

        return firebaseService.set(CHATS_PATH + "/" + chatId + "/messages/" + messageId, message)
                .thenCompose(v -> {
                    // Aggiorna l'ultimo messaggio per tutti i partecipanti
                    return updateLastMessageForParticipants(chatId, message);
                })
                .thenApply(v -> new AbstractMap.SimpleEntry<>(messageId, message));
    }

    /**
     * Aggiorna l'ultimo messaggio per tutti i partecipanti della chat.
     * @param chatId ID della chat
     * @param message Ultimo messaggio
     * @return CompletableFuture completato quando l'operazione è terminata
     */
    private CompletableFuture<Void> updateLastMessageForParticipants(String chatId, Message message) {
        // Codice invariato
        return getChatById(chatId).thenCompose(optionalChat -> {
            if (optionalChat.isPresent()) {
                Chat chat = optionalChat.get().getChat();
                List<CompletableFuture<Void>> futures = new ArrayList<>();

                for (String userId : chat.getParticipants()) {
                    CompletableFuture<Void> future = userService.getUserById(userId)
                            .thenCompose(optionalUser -> {
                                if (optionalUser.isPresent()) {
                                    User user = optionalUser.get().getUser();
                                    Map<String, User.ChatInfo> userChats = user.getChatUser();

                                    if (userChats != null && userChats.containsKey(chatId)) {
                                        User.ChatInfo chatInfo = userChats.get(chatId);
                                        chatInfo.setLastMessage(message.getContent());
                                        chatInfo.setTimestamp(message.getTimestamp());

                                        // Incrementa unreadCount solo se il destinatario è diverso dal mittente
                                        if (!userId.equals(message.getSender())) {
                                            chatInfo.setUnreadCount(chatInfo.getUnreadCount() + 1);
                                        }

                                        userChats.put(chatId, chatInfo);
                                        user.setChatUser(userChats);

                                        // Aggiornamento dell'utente su Firebase
                                        return firebaseService.set(USERS_PATH + "/" + userId, user);
                                    }
                                }
                                return CompletableFuture.completedFuture(null);
                            });

                    futures.add(future);
                }

                // Attendi che tutti gli aggiornamenti siano completati
                return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Marca tutti i messaggi di una chat come letti per un utente specifico.
     * @param chatId ID della chat
     * @param userId ID dell'utente
     * @return CompletableFuture che si completa quando l'operazione è terminata
     */
    public CompletableFuture<Void> markChatAsRead(String chatId, String userId) {
        // Codice invariato
        return userService.getUserById(userId).thenCompose(optionalUser -> {
            if (optionalUser.isPresent()) {
                User user = optionalUser.get().getUser();
                Map<String, User.ChatInfo> userChats = user.getChatUser();

                if (userChats != null && userChats.containsKey(chatId)) {
                    User.ChatInfo chatInfo = userChats.get(chatId);
                    chatInfo.setUnreadCount(0);
                    userChats.put(chatId, chatInfo);
                    user.setChatUser(userChats);

                    // Aggiornamento dell'utente su Firebase
                    return firebaseService.set(USERS_PATH + "/" + userId, user);
                }
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Recupera i messaggi di una chat specifica.
     * @param chatId ID della chat
     * @return CompletableFuture con la mappa di messaggi (ID -> Message)
     */
    public CompletableFuture<Map<String, Message>> getMessagesMap(String chatId) {
        GenericTypeIndicator<Map<String, Message>> typeIndicator = new GenericTypeIndicator<Map<String, Message>>() {};
        return firebaseService.getWithTypeIndicator(CHATS_PATH + "/" + chatId + "/messages", typeIndicator);
    }
}