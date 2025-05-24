package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.request.CreateGroupRequest;
import com.example.bicoChat_backend.dto.request.GroupUpdateRequest;
import com.example.bicoChat_backend.dto.request.RoleUpdateRequest;
import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.dto.response.MessageUpdateNotification;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@Service
public class ChatService {

    private static final String CHATS_PATH = "chats"; // Firebase path for storing chat data
    private static final String USERS_PATH = "users"; // Firebase path for storing user data

    @Autowired
    private FirebaseService firebaseService; // Firebase service for interacting with the database

    @Autowired
    private SimpMessagingTemplate messagingTemplate; // For WebSocket communication to notify clients about updates

    @Autowired
    private UserService userService; // Service for user-related operations

    /**
     * Retrieves all chats from Firebase and returns them as a list of ChatResponse objects.
     *
     * @return A CompletableFuture containing a list of ChatResponse objects.
     */
    public CompletableFuture<List<ChatResponse>> getAllChats() {
        GenericTypeIndicator<Map<String, Chat>> typeIndicator = new GenericTypeIndicator<Map<String, Chat>>() {};

        // Fetching all chats from Firebase and mapping them to ChatResponse objects
        return firebaseService.getWithTypeIndicator(CHATS_PATH, typeIndicator)
                .thenApply(chatsMap -> {
                    List<ChatResponse> chatResponseList = new ArrayList<>();
                    if (chatsMap != null) {
                        for (Map.Entry<String, Chat> entry : chatsMap.entrySet()) {
                            chatResponseList.add(new ChatResponse(entry.getKey(), entry.getValue()));
                        }
                    } else {
                        System.out.println("No chats found on Firebase!");
                    }
                    return chatResponseList;
                });
    }

    /**
     * Retrieves a specific chat by its ID.
     *
     * @param chatId The ID of the chat to retrieve.
     * @return A CompletableFuture containing an Optional ChatResponse object, if the chat exists.
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
     * Creates a new chat and stores it in Firebase.
     *
     * @param chat The chat object to create.
     * @return A CompletableFuture containing the newly created ChatResponse object.
     */
    public CompletableFuture<ChatResponse> createChat(Chat chat) {
        String chatId = UUID.randomUUID().toString(); // Generate a new unique chat ID

        // Saving the new chat to Firebase
        return firebaseService.set(CHATS_PATH + "/" + chatId, chat)
                .thenApply(v -> {
                    updateChatReferencesInUserProfiles(chatId, chat); // Update chat references in user profiles
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
     * Adds a new message to a specific chat and updates the chat references for the participants.
     *
     * @param chatId The ID of the chat.
     * @param message The message to add.
     * @return A CompletableFuture containing the message ID and the message itself.
     */
    public CompletableFuture<Map.Entry<String, Message>> addMessage(String chatId, Message message) {
        String messageId = UUID.randomUUID().toString(); // Generate a new unique message ID

        // Save the new message in Firebase and update participants' chat references
        return firebaseService.set(CHATS_PATH + "/" + chatId + "/messages/" + messageId, message)
                .thenCompose(v -> updateLastMessageForParticipants(chatId, message))
                .thenApply(v -> new AbstractMap.SimpleEntry<>(messageId, message));
    }

    /**
     * Updates the last message details for each participant in a chat.
     *
     * @param chatId The ID of the chat.
     * @param message The message to update.
     * @return A CompletableFuture that completes when the updates are done.
     */
    private CompletableFuture<Void> updateLastMessageForParticipants(String chatId, Message message) {
        return getChatById(chatId).thenCompose(optionalChat -> {
            if (optionalChat.isPresent()) {
                Chat chat = optionalChat.get().getChat();
                List<CompletableFuture<Void>> futures = new ArrayList<>();

                // Loop through each participant and update their last message info
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
                                        chatInfo.setLastUser(message.getSender());

                                        // Increment unread count for both participants (including the sender)
                                        chatInfo.setUnreadCount(chatInfo.getUnreadCount() + 1);

                                        userChats.put(chatId, chatInfo);
                                        user.setChatUser(userChats);

                                        return firebaseService.set(USERS_PATH + "/" + userId, user);
                                    }

                                }
                                return CompletableFuture.completedFuture(null);
                            });

                    futures.add(future);
                }

                return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])); // Wait for all futures to complete
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Marks a chat as read for a specific user by resetting the unread count.
     *
     * @param chatId The ID of the chat to mark as read.
     * @param userId The ID of the user marking the chat as read.
     * @return A CompletableFuture indicating the completion of the operation.
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

                    // Update user data in Firebase
                    return firebaseService.set(USERS_PATH + "/" + userId, user);
                }
            }
            return CompletableFuture.completedFuture(null);
        });
    }

    /**
     * Retrieves a map of messages for a specific chat.
     *
     * @param chatId The ID of the chat to retrieve messages for.
     * @return A CompletableFuture containing the map of messages in the chat.
     */
    public CompletableFuture<Map<String, Message>> getMessagesMap(String chatId) {
        GenericTypeIndicator<Map<String, Message>> typeIndicator = new GenericTypeIndicator<Map<String, Message>>() {};
        return firebaseService.getWithTypeIndicator(CHATS_PATH + "/" + chatId + "/messages", typeIndicator);
    }

    /**
     * Updates the content of a specific message in the chat.
     *
     * @param chatId The ID of the chat containing the message.
     * @param messageId The ID of the message to update.
     * @param newContent The new content for the message.
     * @return A CompletableFuture indicating the completion of the operation.
     */
    public CompletableFuture<Void> updateMessage(String chatId, String messageId, String newContent) {
        String messagePath = CHATS_PATH + "/" + chatId + "/messages/" + messageId;

        return firebaseService.get(messagePath)
                .thenCompose(snapshot -> {
                    if (!snapshot.exists()) {
                        return CompletableFuture.failedFuture(new RuntimeException("Message not found"));
                    }

                    Map<String, Object> messageData = (Map<String, Object>) snapshot.getValue();
                    String senderId = (String) messageData.get("sender");
                    String timestamp = (String) messageData.get("timestamp");

                    // Prepare update for message content
                    Map<String, Object> updates = new HashMap<>();
                    updates.put("content", newContent);

                    // Check if the message is the last message
                    DatabaseReference messagesRef = FirebaseDatabase.getInstance()
                            .getReference(CHATS_PATH + "/" + chatId + "/messages");

                    return getSnapshotFromQuery(messagesRef.orderByChild("timestamp").limitToLast(1))
                            .thenCompose(lastSnapshot -> {
                                boolean isLastMessage = false;
                                for (DataSnapshot child : lastSnapshot.getChildren()) {
                                    if (child.getKey().equals(messageId)) {
                                        isLastMessage = true;
                                        break;
                                    }
                                }

                                if (isLastMessage) {
                                    // If it is the last message, update the chatUser information for all participants
                                    String chatPath = CHATS_PATH + "/" + chatId;
                                    return firebaseService.get(chatPath)
                                            .thenCompose(chatSnap -> {
                                                Map<String, Object> chatData = (Map<String, Object>) chatSnap.getValue();
                                                List<String> participants = (List<String>) chatData.get("participants");

                                                Map<String, Object> patch = new HashMap<>();
                                                for (String uid : participants) {
                                                    String userChatPath = USERS_PATH + "/" + uid + "/chatUser/" + chatId;
                                                    patch.put(userChatPath + "/lastMessage", newContent);
                                                    patch.put(userChatPath + "/lastUser", senderId);
                                                    patch.put(userChatPath + "/timestamp", timestamp);
                                                }

                                                // Add update to the message content as well
                                                patch.put(messagePath + "/content", newContent);

                                                return firebaseService.patch(patch).thenRun(() -> {
                                                    try {
                                                        messagingTemplate.convertAndSend("/topic/messages", new MessageUpdateNotification(chatId, messageId));
                                                    } catch (Exception e) {
                                                        System.err.println("WebSocket PATCH error: " + e.getMessage());
                                                        e.printStackTrace();
                                                    }
                                                });
                                            });
                                } else {
                                    // If not the last message, just update the message
                                    return firebaseService.update(messagePath, updates).thenRun(() -> {
                                        try {
                                            messagingTemplate.convertAndSend("/topic/messages", new MessageUpdateNotification(chatId, messageId));
                                        } catch (Exception e) {
                                            System.err.println("WebSocket UPDATE error: " + e.getMessage());
                                            e.printStackTrace();
                                        }
                                    });
                                }
                            });
                });
    }

    /**
     * Deletes a message in a chat, applying a soft delete.
     *
     * @param chatId The ID of the chat containing the message.
     * @param messageId The ID of the message to delete.
     * @return A CompletableFuture indicating the completion of the operation.
     */
    public CompletableFuture<Void> deleteMessage(String chatId, String messageId) {
        String messagePath = CHATS_PATH + "/" + chatId + "/messages/" + messageId;

        // 1. Retrieve the message
        return firebaseService.get(messagePath)
                .thenCompose(snapshot -> {
                    if (!snapshot.exists()) {
                        return CompletableFuture.failedFuture(new RuntimeException("Message not found"));
                    }

                    Map<String, Object> messageData = (Map<String, Object>) snapshot.getValue();
                    String senderId = (String) messageData.get("sender");

                    Object rawTimestamp = messageData.get("timestamp");
                    String timestamp;
                    if (rawTimestamp != null) {
                        if (rawTimestamp instanceof String) {
                            timestamp = (String) rawTimestamp;
                        } else if (rawTimestamp instanceof Number) {
                            timestamp = String.valueOf(((Number) rawTimestamp).longValue());
                        } else {
                            timestamp = null;
                        }
                    } else {
                        timestamp = null;
                    }

                    // 2. Apply soft delete
                    Map<String, Object> updates = new HashMap<>();
                    updates.put("content", "Message deleted");
                    updates.put("image", null);
                    updates.put("deleted", true);

                    // 3. Check if it is the last message
                    DatabaseReference messagesRef = FirebaseDatabase.getInstance()
                            .getReference(CHATS_PATH + "/" + chatId + "/messages");

                    return getSnapshotFromQuery(messagesRef.orderByChild("timestamp").limitToLast(1))
                            .thenCompose(lastSnapshot -> {
                                boolean isLastMessage = false;

                                for (DataSnapshot child : lastSnapshot.getChildren()) {
                                    if (child.getKey().equals(messageId)) {
                                        isLastMessage = true;
                                        break;
                                    }
                                }

                                if (isLastMessage) {
                                    // 4. Retrieve participants to update `chatUser`
                                    String chatPath = CHATS_PATH + "/" + chatId;
                                    return firebaseService.get(chatPath)
                                            .thenCompose(chatSnap -> {
                                                Map<String, Object> chatData = (Map<String, Object>) chatSnap.getValue();
                                                List<String> participants = (List<String>) chatData.get("participants");

                                                Map<String, Object> patch = new HashMap<>();
                                                for (String uid : participants) {
                                                    String userChatPath = USERS_PATH + "/" + uid + "/chatUser/" + chatId;
                                                    patch.put(userChatPath + "/lastMessage", "Message deleted");
                                                    patch.put(userChatPath + "/lastUser", senderId);
                                                    patch.put(userChatPath + "/timestamp", timestamp);
                                                }

                                                // Apply soft delete + update chatUser information
                                                updates.forEach((k, v) -> patch.put(messagePath + "/" + k, v));
                                                return firebaseService.patch(patch).thenRun(() -> {
                                                    try {
                                                        messagingTemplate.convertAndSend("/topic/messages", new MessageUpdateNotification(chatId, messageId));
                                                    } catch (Exception e) {
                                                        System.err.println("WebSocket PATCH error: " + e.getMessage());
                                                        e.printStackTrace();
                                                    }
                                                });
                                            });
                                } else {
                                    // Just apply the soft delete
                                    return firebaseService.update(messagePath, updates).thenRun(() -> {
                                        try {
                                            messagingTemplate.convertAndSend("/topic/messages", new MessageUpdateNotification(chatId, messageId));
                                        } catch (Exception e) {
                                            System.err.println("WebSocket UPDATE error: " + e.getMessage());
                                            e.printStackTrace();
                                        }
                                    });
                                }
                            });
                });
    }


    private CompletableFuture<DataSnapshot> getSnapshotFromQuery(Query query) {
        CompletableFuture<DataSnapshot> future = new CompletableFuture<>();

        query.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                future.complete(snapshot);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                future.completeExceptionally(error.toException());
            }
        });

        return future;
    }

    public CompletableFuture<ChatResponse> createIndividualChatIfNotExists(String user1Id, String user2Id, String initialMessage) {
        List<String> participants = Arrays.asList(user1Id, user2Id);
        Collections.sort(participants);

        String chatId = participants.get(0) + "_" + participants.get(1);
        System.out.println("🔍 Checking if chat already exists with ID: " + chatId);

        return firebaseService.get(CHATS_PATH + "/" + chatId, Chat.class)
                .thenCompose(existingChat -> {
                    if (existingChat != null) {
                        System.out.println("✅ Chat already exists: " + chatId);
                        return CompletableFuture.completedFuture(new ChatResponse(chatId, existingChat));
                    }

                    System.out.println("🚀 Creating new chat with ID: " + chatId);
                    Chat chat = new Chat();
                    chat.setParticipants(participants);
                    chat.setType("individual");

                    return firebaseService.set(CHATS_PATH + "/" + chatId, chat)
                            .thenCompose(v -> {
                                System.out.println("📦 Chat saved to Firebase: " + chatId);
                                return updateChatReferencesInUserProfiles(chatId, chat);
                            })
                            .thenCompose(v -> {
                                System.out.println("👤 Chat references updated for participants");

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


    public CompletableFuture<Void> createGroupChat(CreateGroupRequest request) {
        String chatId = UUID.randomUUID().toString();
        List<String> participants = new ArrayList<>(request.getParticipants());
        String creatorId = request.getCreatorId();
        if (!participants.contains(creatorId)) {
            participants.add(creatorId);
        }

        Map<String, Object> adminMap = new HashMap<>();
        adminMap.put("creator", creatorId);

        Map<String, Object> chatData = new HashMap<>();
        chatData.put("type", "group");
        chatData.put("title", request.getTitle());
        chatData.put("participants", participants);
        chatData.put("admin", adminMap);
        chatData.put("creator", creatorId);
        if (request.getAvatar() != null) {
            chatData.put("avatar", request.getAvatar());
        }

        String timestamp = LocalDateTime.now().toString();

        // Costruzione del primo messaggio
        String firstMessageId = UUID.randomUUID().toString();
        Map<String, Object> firstMessage = new HashMap<>();
        firstMessage.put("id", firstMessageId);
        firstMessage.put("sender", creatorId);
        firstMessage.put("content", request.getInitialMessage());
        firstMessage.put("timestamp", timestamp);
        firstMessage.put("read", false);

        // PRIMA: salva chat + chatUser
        Map<String, Object> firstBatch = new HashMap<>();
        firstBatch.put("chats/" + chatId, chatData);

        for (String uid : participants) {
            User.ChatInfo info = new User.ChatInfo(
                    request.getInitialMessage(),
                    "Group",
                    timestamp,
                    1,
                    creatorId,
                    request.getTitle(),
                    request.getAvatar(),
                    "group"  // 👈 aggiunto
            );
            firstBatch.put("users/" + uid + "/chatUser/" + chatId, info);
        }

        // SECONDA: salviamo i messaggi dopo
        return firebaseService.updateMulti(firstBatch)
                .thenCompose(aVoid -> {
                    Map<String, Object> secondBatch = new HashMap<>();
                    secondBatch.put("chats/" + chatId + "/messages/" + firstMessageId, firstMessage);
                    return firebaseService.updateMulti(secondBatch);
                });
    }

    public void updateGroupInfo(String chatId, GroupUpdateRequest request) {
        DatabaseReference chatRef = firebaseService.getDatabaseReference()
                .child("chats")
                .child(chatId);

        chatRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    throw new IllegalArgumentException("Chat non trovata.");
                }

                String type = snapshot.child("type").getValue(String.class);
                if (!"group".equals(type)) {
                    throw new IllegalArgumentException("Solo le chat di gruppo possono essere modificate.");
                }

                String creator = snapshot.child("creator").getValue(String.class);
                Map<String, Object> adminMap = (Map<String, Object>) snapshot.child("admin").getValue();

                String requesterId = request.getRequesterId();
                boolean isAdmin = requesterId != null && (
                        requesterId.equals(creator) ||
                                (adminMap != null && adminMap.containsValue(requesterId))
                );

                if (!isAdmin) {
                    throw new SecurityException("Permesso negato.");
                }

                // Aggiorna i campi nel nodo chats/{chatId}
                Map<String, Object> updates = new HashMap<>();
                List<String> updatedFields = new ArrayList<>();
                if (request.getTitle() != null) {
                    updates.put("title", request.getTitle());
                    updatedFields.add("title");
                }
                if (request.getDescription() != null) {
                    updates.put("description", request.getDescription());
                    updatedFields.add("description");
                }
                if (request.getAvatar() != null) {
                    updates.put("avatar", request.getAvatar());
                    updatedFields.add("avatar");
                }

                chatRef.updateChildrenAsync(updates).addListener(() -> {
                    // Dopo l'aggiornamento del gruppo, aggiorna chatUser per ogni partecipante
                    chatRef.child("participants").addListenerForSingleValueEvent(new ValueEventListener() {
                        @Override
                        public void onDataChange(DataSnapshot snapshot) {
                            if (!snapshot.exists()) return;

                            List<String> participantIds = new ArrayList<>();
                            snapshot.getChildren().forEach(child -> {
                                String uid = child.getValue(String.class);
                                if (uid != null) participantIds.add(uid);
                            });

                            for (String uid : participantIds) {
                                DatabaseReference userChatRef = firebaseService.getDatabaseReference()
                                        .child("users")
                                        .child(uid)
                                        .child("chatUser")
                                        .child(chatId);

                                Map<String, Object> userChatUpdates = new HashMap<>();
                                if (request.getTitle() != null) userChatUpdates.put("title", request.getTitle());
                                if (request.getAvatar() != null) userChatUpdates.put("avatar", request.getAvatar());

                                userChatRef.updateChildrenAsync(userChatUpdates);
                            }

                            // ✅ Notifica WebSocket solo dopo aver aggiornato tutti i nodi
                            Map<String, Object> updateNotification = new HashMap<>();
                            updateNotification.put("chatId", chatId);
                            updateNotification.put("fieldsUpdated", updatedFields);

                            messagingTemplate.convertAndSend("/topic/chats", updateNotification);
                        }

                        @Override
                        public void onCancelled(DatabaseError error) {
                            System.err.println("Errore nel recupero dei partecipanti: " + error.getMessage());
                        }
                    });
                }, Runnable::run);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                throw new RuntimeException("Errore Firebase: " + error.getMessage());
            }
        });
    }

    public void updateUserRole(String chatId, RoleUpdateRequest request) {
        DatabaseReference chatRef = firebaseService.getDatabaseReference()
                .child("chats")
                .child(chatId);

        chatRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    throw new IllegalArgumentException("Chat non trovata.");
                }

                String type = snapshot.child("type").getValue(String.class);
                if (!"group".equals(type)) {
                    throw new IllegalArgumentException("Solo le chat di gruppo possono essere modificate.");
                }

                String creator = snapshot.child("creator").getValue(String.class);
                String requesterId = request.getRequesterId();
                String targetUserId = request.getTargetUserId();
                String newRole = request.getNewRole();

                if (!Objects.equals(requesterId, creator)) {
                    throw new SecurityException("Solo il creatore può gestire i ruoli.");
                }

                DataSnapshot adminSnapshot = snapshot.child("admin");
                Map<String, Object> updatedAdminMap = new HashMap<>();
                if (adminSnapshot.exists()) {
                    for (DataSnapshot entry : adminSnapshot.getChildren()) {
                        updatedAdminMap.put(entry.getKey(), entry.getValue());
                    }
                }

                // ⚙️ Promozione o rimozione
                if ("admin".equals(newRole)) {
                    // Aggiungi targetUserId alla mappa se non già presente
                    if (!updatedAdminMap.containsValue(targetUserId)) {
                        updatedAdminMap.put(UUID.randomUUID().toString(), targetUserId);
                    }
                } else if ("member".equals(newRole)) {
                    // Rimuovi targetUserId dalla mappa admin
                    updatedAdminMap.entrySet().removeIf(entry -> Objects.equals(entry.getValue(), targetUserId));
                } else {
                    throw new IllegalArgumentException("Ruolo non valido: " + newRole);
                }

                Map<String, Object> updatePayload = new HashMap<>();
                updatePayload.put("admin", updatedAdminMap);

                chatRef.updateChildrenAsync(updatePayload);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                throw new RuntimeException("Errore Firebase: " + error.getMessage());
            }
        });
    }

    public void removeUserFromGroup(String chatId, String targetUserId, String requesterId) {
        DatabaseReference chatRef = firebaseService.getDatabaseReference()
                .child("chats")
                .child(chatId);

        chatRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    throw new IllegalArgumentException("Chat non trovata.");
                }

                String type = snapshot.child("type").getValue(String.class);
                if (!"group".equals(type)) {
                    throw new IllegalArgumentException("Operazione valida solo per gruppi.");
                }

                String creator = snapshot.child("creator").getValue(String.class);
                List<String> participants = new ArrayList<>();
                snapshot.child("participants").getChildren().forEach(p -> {
                    String id = p.getValue(String.class);
                    if (id != null) participants.add(id);
                });

                Map<String, Object> adminMap = new HashMap<>();
                snapshot.child("admin").getChildren().forEach(a -> {
                    adminMap.put(a.getKey(), a.getValue(String.class));
                });

                boolean isRequesterCreator = requesterId.equals(creator);
                boolean isRequesterAdmin = adminMap.containsValue(requesterId);
                boolean isTargetAdmin = adminMap.containsValue(targetUserId);

                // ❌ Non si può rimuovere il creatore
                if (targetUserId.equals(creator)) {
                    throw new SecurityException("Non è possibile rimuovere il creatore.");
                }

                // 🔒 Controlli permessi
                if (!requesterId.equals(targetUserId)) {
                    if (isRequesterCreator) {
                        // Il creatore può rimuovere tutti tranne se stesso → già garantito
                    } else if (isRequesterAdmin && !isTargetAdmin) {
                        // Admin può rimuovere solo membri
                    } else {
                        throw new SecurityException("Non hai i permessi per rimuovere questo utente.");
                    }
                }

                // Se il target è il creatore che sta uscendo, elimina tutta la chat
                if (targetUserId.equals(creator) && requesterId.equals(creator)) {
                    Map<String, Object> deleteMap = new HashMap<>();
                    deleteMap.put("chats/" + chatId, null);
                    for (String uid : participants) {
                        deleteMap.put("users/" + uid + "/chatUser/" + chatId, null);
                    }
                    firebaseService.updateMulti(deleteMap);
                    messagingTemplate.convertAndSend("/topic/chats", Map.of("chatId", chatId));
                    return;
                }

                // Altrimenti: rimozione utente dal gruppo
                Map<String, Object> updates = new HashMap<>();

                // Aggiorna nodo chat → rimuovi da participants
                List<String> updatedParticipants = new ArrayList<>(participants);
                updatedParticipants.remove(targetUserId);
                updates.put("chats/" + chatId + "/participants", updatedParticipants);

                // Aggiorna nodo chat → rimuovi da admin se presente
                adminMap.entrySet().removeIf(e -> e.getValue().equals(targetUserId));
                updates.put("chats/" + chatId + "/admin", adminMap);

                // Rimuovi nodo utente
                updates.put("users/" + targetUserId + "/chatUser/" + chatId, null);

                firebaseService.updateMulti(updates);
                messagingTemplate.convertAndSend("/topic/chats", Map.of("chatId", chatId));
            }

            @Override
            public void onCancelled(DatabaseError error) {
                throw new RuntimeException("Errore Firebase: " + error.getMessage());
            }
        });
    }

    public void deleteGroupChat(String chatId, String requesterId) {
        DatabaseReference chatRef = firebaseService.getDatabaseReference()
                .child("chats")
                .child(chatId);

        chatRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    throw new IllegalArgumentException("Chat non trovata.");
                }

                String type = snapshot.child("type").getValue(String.class);
                if (!"group".equals(type)) {
                    throw new IllegalArgumentException("Solo le chat di gruppo possono essere eliminate.");
                }

                String creator = snapshot.child("creator").getValue(String.class);
                if (!creator.equals(requesterId)) {
                    throw new SecurityException("Solo il creatore può eliminare il gruppo.");
                }

                List<String> participants = new ArrayList<>();
                snapshot.child("participants").getChildren().forEach(p -> {
                    String id = p.getValue(String.class);
                    if (id != null) participants.add(id);
                });

                Map<String, Object> deleteMap = new HashMap<>();
                deleteMap.put("chats/" + chatId, null);
                for (String uid : participants) {
                    deleteMap.put("users/" + uid + "/chatUser/" + chatId, null);
                }

                firebaseService.updateMulti(deleteMap);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                throw new RuntimeException("Errore Firebase: " + error.getMessage());
            }
        });
    }

    public void addUserToGroup(String chatId, String newUserId, String requesterId) {
        DatabaseReference chatRef = firebaseService.getDatabaseReference()
                .child("chats")
                .child(chatId);

        chatRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) throw new IllegalArgumentException("Gruppo non trovato.");

                String type = snapshot.child("type").getValue(String.class);
                if (!"group".equals(type)) throw new IllegalArgumentException("Non è un gruppo.");

                String creator = snapshot.child("creator").getValue(String.class);
                Map<String, Object> adminMap = new HashMap<>();
                snapshot.child("admin").getChildren().forEach(a -> {
                    adminMap.put(a.getKey(), a.getValue(String.class));
                });

                boolean isAdmin = requesterId.equals(creator) || adminMap.containsValue(requesterId);
                if (!isAdmin) throw new SecurityException("Non hai i permessi.");

                List<String> currentParticipants = new ArrayList<>();
                snapshot.child("participants").getChildren().forEach(p -> {
                    String uid = p.getValue(String.class);
                    if (uid != null) currentParticipants.add(uid);
                });

                if (currentParticipants.contains(newUserId)) {
                    throw new IllegalArgumentException("Utente già nel gruppo.");
                }

                currentParticipants.add(newUserId);

                Map<String, Object> updates = new HashMap<>();
                updates.put("chats/" + chatId + "/participants", currentParticipants);

                // Aggiorna nodo utente
                String title = snapshot.child("title").getValue(String.class);
                String avatar = snapshot.child("avatar").getValue(String.class);
                String now = LocalDateTime.now().toString();

                User.ChatInfo info = new User.ChatInfo(
                        "", title != null ? title : "Group", now, 0, "system",
                        title != null ? title : "Group", avatar,
                        "group" // 👈 aggiunto
                );

                updates.put("users/" + newUserId + "/chatUser/" + chatId, info);

                firebaseService.updateMulti(updates);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                throw new RuntimeException("Errore Firebase: " + error.getMessage());
            }
        });
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






}