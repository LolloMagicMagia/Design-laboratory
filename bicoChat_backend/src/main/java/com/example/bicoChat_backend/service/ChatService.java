package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
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
     * Updates the chat references in user profiles for all participants.
     *
     * @param chatId The ID of the chat.
     * @param chat The chat object.
     * @return A CompletableFuture that completes when all user profiles are updated.
     */
    private CompletableFuture<Void> updateChatReferencesInUserProfiles(String chatId, Chat chat) {
        List<String> participants = chat.getParticipants();
        List<CompletableFuture<Void>> futures = new ArrayList<>();

        // Loop through each participant and update their chat references
        for (String userId : participants) {
            CompletableFuture<Void> future = userService.getUserById(userId)
                    .thenCompose(optionalUser -> {
                        if (optionalUser.isEmpty()) return CompletableFuture.completedFuture(null);
                        User user = optionalUser.get().getUser();

                        if ("individual".equals(chat.getType()) && participants.size() == 2) {
                            // For individual chats, update the references to the other participant's info
                            String otherId = participants.stream().filter(id -> !id.equals(userId)).findFirst().orElse(null);
                            if (otherId != null) {
                                return userService.getUserById(otherId).thenCompose(optOther -> {
                                    if (optOther.isEmpty()) return CompletableFuture.completedFuture(null);
                                    User otherUser = optOther.get().getUser();
                                    String displayName = otherUser.getUsername() != null ? otherUser.getUsername() : otherUser.getEmail();
                                    String avatar = otherUser.getAvatar() != null ? otherUser.getAvatar() : null;

                                    User.ChatInfo chatInfo = new User.ChatInfo(
                                            "", displayName, LocalDateTime.now().toString(), 0, "system",
                                            displayName, avatar,
                                            "individual"  // Individual chat type
                                    );

                                    Map<String, User.ChatInfo> userChats = user.getChatUser();
                                    if (userChats == null) userChats = new HashMap<>();
                                    userChats.put(chatId, chatInfo);
                                    user.setChatUser(userChats);

                                    return firebaseService.set(USERS_PATH + "/" + userId, user);
                                });
                            }
                        }

                        // Fallback for group chats or incomplete chat types
                        String title = chat.getName() != null ? chat.getName() : "Chat";
                        User.ChatInfo chatInfo = new User.ChatInfo(
                                "", title, LocalDateTime.now().toString(), 0, "system",
                                title, null,
                                "group" // Group chat type
                        );

                        Map<String, User.ChatInfo> userChats = user.getChatUser();
                        if (userChats == null) userChats = new HashMap<>();
                        userChats.put(chatId, chatInfo);
                        user.setChatUser(userChats);

                        return firebaseService.set(USERS_PATH + "/" + userId, user);
                    });

            futures.add(future);
        }

        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])); // Wait for all futures to complete
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

    public CompletableFuture<Void> deleteChat(String chatId) {
        return firebaseService.getWithTypeIndicator(
                        "chats/" + chatId + "/participants",
                        new GenericTypeIndicator<List<String>>() {})
                .thenCompose(participants -> {
                    List<CompletableFuture<Void>> deletes = new ArrayList<>();

                    deletes.add(firebaseService.delete("chats/" + chatId));

                    for (String uid : participants) {
                        String userChatPath = String.format("users/%s/chatUser/%s", uid, chatId);
                        deletes.add(firebaseService.delete(userChatPath));
                    }

                    return CompletableFuture.allOf(deletes.toArray(new CompletableFuture[0]));
                });
    }

    public CompletableFuture<ChatResponse> createIndividualChatIfNotExists(String user1Id, String user2Id, String initialMessage) {
        List<String> participants = Arrays.asList(user1Id, user2Id);
        Collections.sort(participants);

        String chatId = participants.get(0) + "_" + participants.get(1);
        System.out.println("Checking if chat already exists with ID: " + chatId);

        return firebaseService.get(CHATS_PATH + "/" + chatId, Chat.class)
                .thenCompose(existingChat -> {
                    if (existingChat != null) {
                        System.out.println("Chat already exists: " + chatId);
                        return CompletableFuture.completedFuture(new ChatResponse(chatId, existingChat));
                    }

                    System.out.println("Creating new chat with ID: " + chatId);
                    Chat chat = new Chat();
                    chat.setParticipants(participants);
                    chat.setType("individual");

                    return firebaseService.set(CHATS_PATH + "/" + chatId, chat)
                            .thenCompose(v -> {
                                System.out.println("Chat saved to Firebase: " + chatId);
                                return updateChatReferencesInUserProfiles(chatId, chat);
                            })
                            .thenCompose(v -> {
                                System.out.println("Chat references updated for participants");

                                Message message = new Message();
                                message.setSender(user1Id);
                                message.setContent(initialMessage);
                                message.setTimestamp(LocalDateTime.now().toString());
                                message.setRead(false);

                                return addMessage(chatId, message)
                                        .thenApply(entry -> {
                                            System.out.println("✉️ Initial message sent: " + initialMessage);
                                            return new ChatResponse(chatId, chat);
                                        });
                            });
                });
    }


}