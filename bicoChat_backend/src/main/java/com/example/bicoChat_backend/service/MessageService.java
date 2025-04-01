package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class MessageService {

    @Autowired
    private ChatService chatService;

    public List<Message> getMessages(String chatId) {
        return chatService.getChatById(chatId) // Restituisce un Optional<Chat>
                .map(Chat::getMessages)  // Estrae la lista di messaggi se la chat esiste
                .orElse(Collections.emptyList());  // Ritorna una lista vuota se la chat non esiste
    }

    // per recuperare un messaggio (utile per eliminare o modificare messaggi)
    public Optional<Message> getMessage(String chatId, String messageId) {
        // Ottiene un Optional<Chat> utilizzando l'ID della chat dal ChatService
        return chatService.getChatById(chatId)
                // Se la chat esiste, utilizza flatMap per operare sui suoi messaggi
                // flatMap è usato perché lavoriamo con due livelli di Optional
                .flatMap(chat -> chat.getMessages().stream()
                        // Filtra i messaggi per trovare quello con l'ID corrispondente
                        .filter(message -> message.getId().equals(messageId))
                        // Prende il primo messaggio corrispondente (dovrebbe essere unico)
                        .findFirst());
    }

    public Optional<Message> addMessage(String chatId, String sender, String content) {
        LocalDateTime timestamp = LocalDateTime.now();
        String messageId = UUID.randomUUID().toString();
        boolean read = "currentUser".equals(sender);

        Message newMessage = new Message();
        newMessage.setId(messageId);
        newMessage.setChatId(chatId);
        newMessage.setSender(sender);
        newMessage.setContent(content);
        newMessage.setTimestamp(timestamp);
        newMessage.setRead(read);

        // Aggiungi il messaggio alla chat
        chatService.getChatById(chatId).ifPresent(chat -> {
            chat.addMessage(newMessage);
            // Aggiorna solo lastMessage e unreadCount
            chatService.updateLastMessageReference(chatId, newMessage);
        });
        return getMessage(chatId, messageId);
    }

    // In MessageService
    public void markChatMessagesAsRead(String chatId) {
        chatService.markAllMessagesAsRead(chatId);
    }
}
