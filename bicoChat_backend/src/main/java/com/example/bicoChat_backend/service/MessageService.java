package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.MessageResponse;
import com.example.bicoChat_backend.model.Message;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.stream.Collectors;

@Service
public class MessageService {

    @Autowired
    private ChatService chatService;

    /**
     * Recupera tutti i messaggi di una chat specifica.
     * @param chatId ID della chat
     * @return CompletableFuture con la lista di MessageResponse
     */
    public CompletableFuture<List<MessageResponse>> getMessages(String chatId) {
        return chatService.getMessagesMap(chatId)
                .thenApply(messagesMap -> {
                    List<MessageResponse> messageResponseList = new ArrayList<>();
                    if (messagesMap != null) {
                        for (Map.Entry<String, Message> entry : messagesMap.entrySet()) {
                            messageResponseList.add(new MessageResponse(entry.getKey(), entry.getValue()));
                        }
                        // Ordina i messaggi per timestamp
                        messageResponseList.sort(Comparator.comparing(mr -> mr.getMessage().getTimestamp()));
                    }
                    return messageResponseList;
                });
    }

    /**
     * Aggiunge un nuovo messaggio a una chat.
     * @param chatId ID della chat
     * @param sender ID del mittente
     * @param content Contenuto del messaggio
     * @return CompletableFuture con il MessageResponse creato
     */
    public CompletableFuture<MessageResponse> addMessage(String chatId, String sender, String content) {
        // Crea il nuovo messaggio
        Message message = new Message();
        message.setSender(sender);
        message.setContent(content);
        message.setTimestamp(LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME));
        message.setRead("currentUser".equals(sender)); // Il messaggio è letto se inviato dall'utente corrente

        // Aggiunge il messaggio alla chat
        return chatService.addMessage(chatId, message)
                .thenApply(entry -> new MessageResponse(entry.getKey(), entry.getValue()));
    }

    /**
     * Marca tutti i messaggi di una chat come letti per un utente specifico.
     * @param chatId ID della chat
     * @param userId ID dell'utente
     * @return CompletableFuture che si completa quando l'operazione è terminata
     */
    public CompletableFuture<Void> markChatMessagesAsRead(String chatId, String userId) {
        return chatService.markChatAsRead(chatId, userId);
    }
}