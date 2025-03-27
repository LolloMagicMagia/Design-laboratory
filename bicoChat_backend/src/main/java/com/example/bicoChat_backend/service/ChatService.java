package com.example.bicoChat_backend.service;


import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import com.example.bicoChat_backend.model.User;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
public class ChatService {

    private UserService userService;
    private Map<String, Chat> chats;
    private List<Chat> chatList;

    @Autowired
    public ChatService(UserService userService) {
        this.userService = userService;
    }

    @PostConstruct
    public void init() {
        this.chats = new ConcurrentHashMap<>();
        this.chatList = new ArrayList<>();
        initializeExampleChat();
    }

    private void initializeExampleChat() {
        // Ottieni l'utente corrente
        User currentUser = userService.getCurrentUser();

        // Usa Marco Rossi (ID: 1) come esempio
        Optional<User> exampleUser = userService.getUserById("1");

        if (exampleUser.isPresent()) {
            User user = exampleUser.get();
            String chatId = UUID.randomUUID().toString();

            // Crea una nuova chat
            Chat chat = new Chat();
            chat.setId(chatId);
            chat.setName(user.getName());
            chat.setType("individual");

            // Aggiungi i partecipanti (utente corrente e altro utente)
            List<String> participants = new ArrayList<>();
            participants.add(currentUser.getId());
            participants.add(user.getId());
            chat.setParticipants(participants);

            // Inizializza altri campi della chat
            chat.setUnreadCount(0);

            // Aggiungi la chat alla mappa
            chats.put(chatId, chat);

            // Aggiungi alcuni messaggi di esempio
            addSampleMessages(chat, user.getId());
        }
    }

    private void addSampleMessages(Chat chat, String otherUserId) {
        // Crea alcuni messaggi di esempio per la chat
        LocalDateTime now = LocalDateTime.now();

        // Esempio di messaggio dall'altro utente
        Message message1 = new Message();
        message1.setId(UUID.randomUUID().toString());
        message1.setChatId(chat.getId());
        message1.setSender(otherUserId);
        message1.setContent("Ciao! Come stai oggi?");
        message1.setTimestamp(now.minusMinutes(30));
        message1.setRead(true);

        // Esempio di messaggio dall'utente corrente
        Message message2 = new Message();
        message2.setId(UUID.randomUUID().toString());
        message2.setChatId(chat.getId());
        message2.setSender("currentUser");
        message2.setContent("Tutto bene, grazie! E tu?");
        message2.setTimestamp(now.minusMinutes(25));
        message2.setRead(true);

        // Aggiungi i messaggi alla chat
        chat.addMessage(message1);
        chat.addMessage(message2);

        // Imposta l'ultimo messaggio
        Chat.LastMessage lastMessage = new Chat.LastMessage();
        lastMessage.setSender(message2.getSender());
        lastMessage.setContent(message2.getContent());
        lastMessage.setTimestamp(message2.getTimestamp());
        lastMessage.setRead(true);
        chat.setLastMessage(lastMessage);
    }

    public List<Chat> getAllChats() {
        return new ArrayList<>(chats.values());
    }

    public Optional<Chat> getChatById(String id) {
        return Optional.ofNullable(chats.get(id));
    }

    public void addChat(Chat chat) {
        chats.put(chat.getId(), chat);
    }

    public Chat createChat(String name, List<String> participants) {
        String chatId = UUID.randomUUID().toString();
        Chat chat = new Chat(chatId, name, participants);
        chat.setUnreadCount(0);
        addChat(chat);
        return chat;
    }

    // TODO la logica di creazione della chat è responsabilità del chiamante (view o controller)
    //  --> NON IL MASSIMO
    public Chat createChat(Chat chat) {
        String chatId = UUID.randomUUID().toString();
        chat.setId(chatId);
        chat.setUnreadCount(0);
        addChat(chat);
        return chat;
    }

    public boolean markChatAsRead(String chatId) {
        return getChatById(chatId).map(chat -> {
            chat.setUnreadCount(0);
            if (chat.getLastMessage() != null) {
                chat.getLastMessage().setRead(true);
            }
            chats.replace(chatId, chat);
            return true;
        }).orElse(false);
    }

    public void updateLastMessage(String chatId, String sender, String content, LocalDateTime timestamp, boolean read) {
        getChatById(chatId).ifPresent(chat -> {
            Chat.LastMessage lastMessage = new Chat.LastMessage();
            lastMessage.setSender(sender);
            lastMessage.setContent(content);
            lastMessage.setTimestamp(timestamp);
            lastMessage.setRead(read);

            // Imposta senderName per i gruppi
            if ("group".equals(chat.getType()) && !"currentUser".equals(sender)) {
                lastMessage.setSenderName(sender);
            }

            chat.setLastMessage(lastMessage);

            // Incrementa il contatore dei messaggi non letti se necessario
            if (!sender.equals("currentUser")) {
                chat.setUnreadCount(chat.getUnreadCount() + 1);
            }
            chats.replace(chatId, chat);
        });
    }


    public void updateLastMessageReference(String chatId, Message message) {
        getChatById(chatId).ifPresent(chat -> {
            // Crea un LastMessage basato sul messaggio esistente
            Chat.LastMessage lastMessage = new Chat.LastMessage();
            lastMessage.setSender(message.getSender());
            lastMessage.setContent(message.getContent());
            lastMessage.setTimestamp(message.getTimestamp());
            lastMessage.setRead(message.isRead());

            // Imposta senderName per i gruppi
            if ("group".equals(chat.getType()) && !"currentUser".equals(message.getSender())) {
                // Qui dovresti ottenere il nome reale dell'utente dal UserService
                Optional<User> senderUser = userService.getUserById(message.getSender());
                senderUser.ifPresent(user -> lastMessage.setSenderName(user.getName()));
            }

            chat.setLastMessage(lastMessage);

            // Incrementa il contatore dei messaggi non letti se necessario
            if (!message.getSender().equals("currentUser") && !message.isRead()) {
                chat.setUnreadCount(chat.getUnreadCount() + 1);
            }

            chats.replace(chatId, chat);
        });
    }

    public void markAllMessagesAsRead(String chatId) {
        getChatById(chatId).ifPresent(chat -> {
            List<Message> messages = chat.getMessages();
            boolean updated = false;

            for (Message message : messages) {
                if (!message.isRead()) {
                    message.setRead(true);
                    updated = true;
                }
            }

            // Aggiorna anche il contatore di non letti
            if (updated) {
                chat.setUnreadCount(0);
                if (chat.getLastMessage() != null) {
                    chat.getLastMessage().setRead(true);
                }
            }
        });
    }
}