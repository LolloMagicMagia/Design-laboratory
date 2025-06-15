package com.example.bicoChat_backend;


import com.example.bicoChat_backend.controller.ChatController;
import com.example.bicoChat_backend.dto.request.CreateGroupRequest;
import com.example.bicoChat_backend.dto.request.GroupUpdateRequest;
import com.example.bicoChat_backend.dto.request.RoleUpdateRequest;
import com.example.bicoChat_backend.dto.response.ChatResponse;
import com.example.bicoChat_backend.model.Chat;
import com.example.bicoChat_backend.service.ChatService;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.*;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class ChatControllerTest {

    @Mock
    private ChatService chatService;

    @Mock
    private UserService userService;

    @Mock
    private FirebaseService firebaseService;

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    @InjectMocks
    private ChatController chatController;

    @BeforeEach
    public void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    public void testGetAllChats() throws Exception {
        // Arrange
        List<ChatResponse> mockChats = Arrays.asList(
                new ChatResponse("chat1", new Chat()),
                new ChatResponse("chat2", new Chat())
        );

        when(chatService.getAllChats()).thenReturn(CompletableFuture.completedFuture(mockChats));

        // Act
        List<ChatResponse> result = chatController.getAllChats();

        // Assert
        assertEquals(2, result.size());
        verify(chatService, times(1)).getAllChats();
    }

    @Test
    public void testGetChatById_Found() throws Exception {
        // Arrange
        String chatId = "chat123";
        ChatResponse mockChatResponse = new ChatResponse(chatId, new Chat());

        when(chatService.getChatById(chatId)).thenReturn(
                CompletableFuture.completedFuture(Optional.of(mockChatResponse))
        );

        // Act
        ResponseEntity<ChatResponse> response = chatController.getChatById(chatId);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(chatId, response.getBody().getId());
        verify(chatService, times(1)).getChatById(chatId);
    }

    @Test
    public void testGetChatById_NotFound() throws Exception {
        // Arrange
        String chatId = "nonexistent";

        when(chatService.getChatById(chatId)).thenReturn(
                CompletableFuture.completedFuture(Optional.empty())
        );

        // Act
        ResponseEntity<ChatResponse> response = chatController.getChatById(chatId);

        // Assert
        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNull(response.getBody());
        verify(chatService, times(1)).getChatById(chatId);
    }

    @Test
    public void testCreateIndividualChat_ValidRequest() {
        // Arrange
        Map<String, String> payload = new HashMap<>();
        payload.put("senderId", "user1");
        payload.put("receiverId", "user2");
        payload.put("message", "Hello");

        ChatResponse mockResponse = new ChatResponse("chat123", new Chat());

        when(chatService.createIndividualChatIfNotExists("user1", "user2", "Hello"))
                .thenReturn(CompletableFuture.completedFuture(mockResponse));

        // Act
        CompletableFuture<ResponseEntity<Map<String, Object>>> futureResponse =
                chatController.createIndividualChat(payload);

        ResponseEntity<Map<String, Object>> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("chat123", response.getBody().get("chatId"));
        assertEquals(false, response.getBody().get("alreadyExists"));
        verify(chatService, times(1)).createIndividualChatIfNotExists("user1", "user2", "Hello");
    }

    @Test
    public void testCreateIndividualChat_MissingParameters() {
        // Arrange
        Map<String, String> payload = new HashMap<>();
        payload.put("senderId", "user1");
        // Missing receiverId and message

        // Act
        CompletableFuture<ResponseEntity<Map<String, Object>>> futureResponse =
                chatController.createIndividualChat(payload);

        ResponseEntity<Map<String, Object>> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Missing parameters", response.getBody().get("error"));
        verify(chatService, never()).createIndividualChatIfNotExists(anyString(), anyString(), anyString());
    }

    @Test
    public void testCreateGroupChat_ServiceException() {
        // Arrange
        CreateGroupRequest request = new CreateGroupRequest();
        request.setTitle("Test Group");
        request.setCreatorId("user1");
        request.setParticipants(Arrays.asList("user2", "user3"));

        doThrow(new RuntimeException("Database error")).when(chatService).createGroupChat(request);

        // Act
        ResponseEntity<String> response = chatController.createGroupChat(request);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertTrue(response.getBody().contains("Errore nella creazione della chat di gruppo"));
        verify(chatService, times(1)).createGroupChat(request);
    }

    @Test
    public void testUpdateGroupInfo_Success() {
        // Arrange
        String chatId = "group123";
        GroupUpdateRequest request = new GroupUpdateRequest();
        request.setTitle("Updated Group Name");
        request.setRequesterId("admin1");

        doNothing().when(chatService).updateGroupInfo(chatId, request);

        // Act
        ResponseEntity<String> response = chatController.updateGroupInfo(chatId, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Gruppo aggiornato con successo.", response.getBody());
        verify(chatService, times(1)).updateGroupInfo(chatId, request);
    }

    @Test
    public void testUpdateGroupInfo_PermissionDenied() {
        // Arrange
        String chatId = "group123";
        GroupUpdateRequest request = new GroupUpdateRequest();
        request.setTitle("Updated Group Name");
        request.setRequesterId("regularUser");

        doThrow(new SecurityException("No permission")).when(chatService).updateGroupInfo(chatId, request);

        // Act
        ResponseEntity<String> response = chatController.updateGroupInfo(chatId, request);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Non hai i permessi per modificare il gruppo.", response.getBody());
        verify(chatService, times(1)).updateGroupInfo(chatId, request);
    }

    @Test
    public void testUpdateUserRole_Success() {
        // Arrange
        String chatId = "group123";
        RoleUpdateRequest request = new RoleUpdateRequest();
        request.setRequesterId("admin1");
        request.setTargetUserId("user1");
        request.setNewRole("admin");

        doNothing().when(chatService).updateUserRole(chatId, request);

        // Act
        ResponseEntity<String> response = chatController.updateUserRole(chatId, request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Ruolo aggiornato.", response.getBody());
        verify(chatService, times(1)).updateUserRole(chatId, request);
    }

    @Test
    public void testRemoveUserFromGroup_Success() {
        // Arrange
        String chatId = "group123";
        String targetUserId = "user1";
        String requesterId = "admin1";

        doNothing().when(chatService).removeUserFromGroup(chatId, targetUserId, requesterId);

        // Act
        ResponseEntity<String> response = chatController.removeUserFromGroup(chatId, targetUserId, requesterId);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Utente rimosso con successo.", response.getBody());
        verify(chatService, times(1)).removeUserFromGroup(chatId, targetUserId, requesterId);
    }

    @Test
    public void testDeleteGroupChat_Success() {
        // Arrange
        String chatId = "group123";
        String requesterId = "creator1";

        doNothing().when(chatService).deleteGroupChat(chatId, requesterId);

        // Act
        ResponseEntity<String> response = chatController.deleteGroupChat(chatId, requesterId);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Gruppo eliminato.", response.getBody());
        verify(chatService, times(1)).deleteGroupChat(chatId, requesterId);
    }

    @Test
    public void testDeleteGroupChat_PermissionDenied() {
        // Arrange
        String chatId = "group123";
        String requesterId = "regularUser";

        doThrow(new SecurityException("Permission denied")).when(chatService).deleteGroupChat(chatId, requesterId);

        // Act
        ResponseEntity<String> response = chatController.deleteGroupChat(chatId, requesterId);

        // Assert
        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("Non sei autorizzato a eliminare il gruppo.", response.getBody());
        verify(chatService, times(1)).deleteGroupChat(chatId, requesterId);
    }

    @Test
    public void testAddUserToGroup_Success() {
        // Arrange
        String chatId = "group123";
        String userId = "newUser";
        String requesterId = "admin1";

        doNothing().when(chatService).addUserToGroup(chatId, userId, requesterId);

        // Act
        ResponseEntity<String> response = chatController.addUserToGroup(chatId, userId, requesterId);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals("Utente aggiunto al gruppo.", response.getBody());
        verify(chatService, times(1)).addUserToGroup(chatId, userId, requesterId);
    }

    @Test
    public void testDeleteChat_Success() {
        // Arrange
        String chatId = "chat123";

        when(chatService.deleteChat(chatId)).thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<ResponseEntity<Void>> futureResponse = chatController.deleteChat(chatId);
        ResponseEntity<Void> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(chatService, times(1)).deleteChat(chatId);
    }

    @Test
    public void testHideChat_Success() {
        // Arrange
        String chatId = "chat123";
        String userId = "user1";
        String pin = "1234";

        when(userService.hideChat(userId, chatId, pin)).thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<ResponseEntity<Object>> futureResponse = chatController.hideChat(chatId, userId, pin);
        ResponseEntity<Object> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userService, times(1)).hideChat(userId, chatId, pin);
    }

    @Test
    public void testUnhideChat_Success() {
        // Arrange
        String chatId = "chat123";
        String userId = "user1";

        when(userService.unhideChat(userId, chatId)).thenReturn(CompletableFuture.completedFuture(null));

        // Act
        CompletableFuture<ResponseEntity<Object>> futureResponse = chatController.unhideChat(chatId, userId);
        ResponseEntity<Object> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        verify(userService, times(1)).unhideChat(userId, chatId);
    }

    @Test
    public void testVerifyPin_Success() {
        // Arrange
        String chatId = "chat123";
        String userId = "user1";
        String pin = "1234";

        when(userService.verifyHiddenChatPin(userId, chatId, pin))
                .thenReturn(CompletableFuture.completedFuture(true));

        // Act
        CompletableFuture<ResponseEntity<Boolean>> futureResponse =
                chatController.verifyPin(chatId, userId, pin);
        ResponseEntity<Boolean> response = futureResponse.join();

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody());
        verify(userService, times(1)).verifyHiddenChatPin(userId, chatId, pin);
    }
}