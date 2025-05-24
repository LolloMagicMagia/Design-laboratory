package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.MessageResponse;
import com.example.bicoChat_backend.model.Message;
import com.google.firebase.database.GenericTypeIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

/**
 * Service class responsible for handling messages within a chat.
 */
@Service
public class MessageService {

    private static final String CHATS_PATH = "chats";

    @Autowired
    private ChatService chatService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    /**
     * Retrieves all messages from a given chat.
     *
     * @param chatId the chat ID
     * @return a CompletableFuture containing a list of MessageResponse objects
     */
    public CompletableFuture<List<MessageResponse>> getMessages(String chatId) {
        return chatService.getMessagesMap(chatId)
                .thenApply(messagesMap -> {
                    List<MessageResponse> messageResponseList = new ArrayList<>();
                    if (messagesMap != null) {
                        for (Map.Entry<String, Message> entry : messagesMap.entrySet()) {
                            messageResponseList.add(new MessageResponse(entry.getKey(), entry.getValue()));
                        }
                        messageResponseList.sort(Comparator.comparing(mr -> mr.getMessage().getTimestamp()));
                    }
                    return messageResponseList;
                });
    }

    /**
     * Adds a new message to a given chat.
     *
     * @param chatId the chat ID
     * @param sender the sender of the message
     * @param content the content of the message
     * @return a CompletableFuture containing the newly added message as MessageResponse
     */
    public CompletableFuture<MessageResponse> addMessage(String chatId, String sender, String content) {
        Message message = new Message();
        message.setSender(sender);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        message.setRead("currentUser".equals(sender));

        return chatService.addMessage(chatId, message)
                .thenApply(entry -> new MessageResponse(entry.getKey(), entry.getValue()));
    }

    /**
     * Marks all messages in a chat as read by a specific user.
     *
     * @param chatId the chat ID
     * @param userId the user ID
     * @return a CompletableFuture indicating when the operation is complete
     */
    public CompletableFuture<Void> markChatMessagesAsRead(String chatId, String userId) {
        return chatService.markChatAsRead(chatId, userId);
    }

    /**
     * Retrieves all messages from a chat, sorted by timestamp.
     *
     * @param chatId the chat ID
     * @return a CompletableFuture containing a list of Message objects
     */
    public CompletableFuture<List<Message>> getMessagesByChatId(String chatId) {
        return chatService.getMessagesMap(chatId)
                .thenApply(messagesMap -> {
                    if (messagesMap == null) return Collections.emptyList();

                    return messagesMap.entrySet().stream()
                            .map(entry -> {
                                Message message = entry.getValue();
                                message.setId(entry.getKey());
                                return message;
                            })
                            .sorted(Comparator.comparing(Message::getTimestamp))
                            .collect(Collectors.toList());
                });
    }

    /**
     * Sends a new message to a chat and updates the chat participants with the latest message details.
     *
     * @param chatId the chat ID
     * @param message the message to be sent
     * @return a CompletableFuture containing the response with message details
     */
    public CompletableFuture<Map<String, Object>> sendMessage(String chatId, Message message) {
        String messageId = "msg" + System.currentTimeMillis();
        String timestamp = message.getTimestamp();
        String content = message.getContent();
        String sender = message.getSender();
        String image = message.getImage(); // new field

        CompletableFuture<Void> saveMessageFuture =
                firebaseService.set("chats/" + chatId + "/messages/" + messageId, message);

        GenericTypeIndicator<List<String>> typeIndicator = new GenericTypeIndicator<>() {};
        CompletableFuture<List<String>> participantsFuture =
                firebaseService.getWithTypeIndicator("chats/" + chatId + "/participants", typeIndicator);

        CompletableFuture<Map<String, Map<String, Object>>> usersFuture =
                firebaseService.getWithTypeIndicator("users", new GenericTypeIndicator<>() {});

        return CompletableFuture.allOf(saveMessageFuture, participantsFuture, usersFuture)
                .thenCompose(ignore -> {
                    List<String> participants = participantsFuture.join();
                    Map<String, Map<String, Object>> usersMap = usersFuture.join();

                    List<CompletableFuture<Void>> updates = new ArrayList<>();

                    for (String uid : participants) {
                        if (uid == null || uid.isBlank()) continue;

                        String userChatPath = String.format("users/%s/chatUser/%s", uid, chatId);
                        String unreadCountPath = String.format("users/%s/chatUser/%s/unreadCount", uid, chatId);

                        String name = "Chat";
                        if (participants.size() == 2) {
                            String otherId = participants.stream().filter(p -> !p.equals(uid)).findFirst().orElse(null);
                            if (otherId != null && usersMap.containsKey(otherId)) {
                                name = (String) usersMap.get(otherId).get("username");
                            }
                        }

                        Map<String, Object> chatUserUpdate = new HashMap<>();
                        chatUserUpdate.put("name", name);
                        chatUserUpdate.put("lastMessage", content);
                        chatUserUpdate.put("lastUser", sender);
                        chatUserUpdate.put("timestamp", timestamp);

                        CompletableFuture<Void> updateFuture = firebaseService.get(unreadCountPath, Long.class)
                                .thenCompose(currentUnread -> {
                                    long newCount = (currentUnread != null) ? currentUnread + 1 : 1;
                                    chatUserUpdate.put("unreadCount", newCount);
                                    return firebaseService.update(userChatPath, chatUserUpdate);
                                });

                        updates.add(updateFuture);
                    }

                    return CompletableFuture.allOf(updates.toArray(new CompletableFuture[0]))
                            .thenApply(done -> {
                                Map<String, Object> updateNotification = new HashMap<>();
                                updateNotification.put("chatId", chatId);
                                updateNotification.put("fieldsUpdated", List.of("lastMessage", "lastUser", "timestamp"));

                                messagingTemplate.convertAndSend("/topic/chats", updateNotification);

                                Map<String, Object> response = new HashMap<>();
                                response.put("id", messageId);
                                response.put("chatId", chatId);
                                response.put("content", content);
                                response.put("sender", sender);
                                response.put("timestamp", timestamp);
                                response.put("image", image); // included in the response

                                return response;
                            });
                });
    }

    /**
     * Retrieves a specific message by its ID from a chat.
     *
     * @param chatId the chat ID
     * @param messageId the message ID
     * @return a CompletableFuture containing the Message object
     */
    public CompletableFuture<Message> getMessageById(String chatId, String messageId) {
        String path = CHATS_PATH + "/" + chatId + "/messages/" + messageId;
        return firebaseService.get(path).thenApply(snapshot -> {
            if (!snapshot.exists()) {
                throw new RuntimeException("Message not found");
            }

            Map<String, Object> data = (Map<String, Object>) snapshot.getValue();

            Message msg = new Message();
            msg.setId(messageId);
            msg.setSender((String) data.get("sender"));
            msg.setContent((String) data.get("content"));
            msg.setTimestamp(data.get("timestamp") != null ? data.get("timestamp").toString() : null);
            msg.setRead(Boolean.TRUE.equals(data.get("read")));
            msg.setDeleted(Boolean.TRUE.equals(data.getOrDefault("deleted", false)));

            // Add robust check for image
            Object imageObj = data.get("image");
            if (imageObj instanceof String) {
                msg.setImage((String) imageObj);
            } else if (imageObj != null) {
                msg.setImage(imageObj.toString()); // fallback
            } else {
                msg.setImage(null);
            }

            return msg;
        });
    }
}
