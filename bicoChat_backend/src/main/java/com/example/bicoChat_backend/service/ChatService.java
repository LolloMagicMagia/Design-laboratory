package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.*;
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
     * Retrieves all chats from the Firebase Realtime Database.
     * @return CompletableFuture with the list of chats
     */
    public CompletableFuture<List<ChatResponse>> getAllChats() {
        GenericTypeIndicator<Map<String, Chat>> typeIndicator = new GenericTypeIndicator<Map<String, Chat>>() {};

        return firebaseService.getWithTypeIndicator(CHATS_PATH, typeIndicator)
                .thenApply(chatsMap -> {
                    List<ChatResponse> chatResponseList = new ArrayList<>();
                    if (chatsMap != null) {
                        //System.out.println("Chats found on Firebase: " + chatsMap.size());
                        for (Map.Entry<String, Chat> entry : chatsMap.entrySet()) {
                            //System.out.println("Chat ID: " + entry.getKey() + " - Name: " + entry.getValue().getName());
                            chatResponseList.add(new ChatResponse(entry.getKey(), entry.getValue()));
                        }
                    } else {
                        System.out.println("No chats found on Firebase!");
                    }
                    return chatResponseList;
                });
    }


    /**
     * Retrieves a specific chat from the Firebase Realtime Database.
     * @param chatId ID of the chat
     * @return CompletableFuture with the found chat or an empty Optional
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
     * Creates a new chat in the Firebase Realtime Database.
     * @param chat Chat to create
     * @return CompletableFuture with the created chat
     */
    public CompletableFuture<ChatResponse> createChat(Chat chat) {
        String chatId = UUID.randomUUID().toString();

        return firebaseService.set(CHATS_PATH + "/" + chatId, chat)
                .thenApply(v -> {
                    // Updates the chat references in user profiles
                    updateChatReferencesInUserProfiles(chatId, chat);
                    return new ChatResponse(chatId, chat);
                });
    }

    /**
     * Updates the chat references in the profiles of the participating users.
     * @param chatId ID of the chat
     * @param chat Chat to reference
     */
    private void updateChatReferencesInUserProfiles(String chatId, Chat chat) {
        for (String userId : chat.getParticipants()) {
            userService.getUserById(userId).thenAccept(optionalUser -> {
                optionalUser.ifPresent(userResponse -> {
                    User user = userResponse.getUser();

                    // Creates a ChatInfo for the user
                    User.ChatInfo chatInfo = new User.ChatInfo(
                            "", // Empty last message initially
                            chat.getName() != null ? chat.getName() : userId,
                            LocalDateTime.now().toString(),
                            0
                    );

                    // Adds the chat to the user's chats
                    Map<String, User.ChatInfo> userChats = user.getChatUser();
                    if (userChats == null) {
                        userChats = new HashMap<>();
                    }
                    userChats.put(chatId, chatInfo);
                    user.setChatUser(userChats);

                    // Updates the user on Firebase
                    firebaseService.set(USERS_PATH + "/" + userId, user);
                });
            });
        }
    }

    /**
     * Adds a message to an existing chat.
     * @param chatId ID of the chat
     * @param message Message to add
     * @return CompletableFuture with the added message and its ID
     */
    public CompletableFuture<Map.Entry<String, Message>> addMessage(String chatId, Message message) {
        String messageId = UUID.randomUUID().toString();

        return firebaseService.set(CHATS_PATH + "/" + chatId + "/messages/" + messageId, message)
                .thenCompose(v -> {
                    // Updates the last message for all participants
                    return updateLastMessageForParticipants(chatId, message);
                })
                .thenApply(v -> new AbstractMap.SimpleEntry<>(messageId, message));
    }

    /**
     * Updates the last message for all participants of the chat.
     * @param chatId ID of the chat
     * @param message Last message
     * @return CompletableFuture completed when the operation is finished
     */
    private CompletableFuture<Void> updateLastMessageForParticipants(String chatId, Message message) {
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

                                        // Increments unreadCount only if the recipient is different from the sender
                                        if (!userId.equals(message.getSender())) {
                                            chatInfo.setUnreadCount(chatInfo.getUnreadCount() + 1);
                                        }

                                        userChats.put(chatId, chatInfo);
                                        user.setChatUser(userChats);

                                        // User update on Firebase
                                        return firebaseService.set(USERS_PATH + "/" + userId, user);
                                    }
                                }
                                return CompletableFuture.completedFuture(null);
                            });

                    futures.add(future);
                }

                // Wait for all updates to be completed
                return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Marks all messages in a chat as read for a specific user.
     * @param chatId ID of the chat
     * @param userId ID of the user
     * @return CompletableFuture that completes when the operation is finished
     */
    public CompletableFuture<Void> markChatAsRead(String chatId, String userId) {
        return userService.getUserById(userId).thenCompose(optionalUser -> {
            if (optionalUser.isPresent()) {
                User user = optionalUser.get().getUser();
                Map<String, User.ChatInfo> userChats = user.getChatUser();

                if (userChats != null && userChats.containsKey(chatId)) {
                    User.ChatInfo chatInfo = userChats.get(chatId);
                    chatInfo.setUnreadCount(0);
                    userChats.put(chatId, chatInfo);
                    user.setChatUser(userChats);

                    return firebaseService.set(USERS_PATH + "/" + userId, user);
                }
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Retrieves the messages of a specific chat.
     * @param chatId ID of the chat
     * @return CompletableFuture with the map of messages (ID -> Message)
     */
    public CompletableFuture<Map<String, Message>> getMessagesMap(String chatId) {
        GenericTypeIndicator<Map<String, Message>> typeIndicator = new GenericTypeIndicator<Map<String, Message>>() {};
        return firebaseService.getWithTypeIndicator(CHATS_PATH + "/" + chatId + "/messages", typeIndicator);
    }


}