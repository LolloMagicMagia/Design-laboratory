package com.example.bicoChat_backend;

import com.example.bicoChat_backend.dto.response.UserResponse;
import com.example.bicoChat_backend.model.User;
import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.UserService;
import com.google.firebase.database.GenericTypeIndicator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private FirebaseService firebaseService;

    private UserService userService;

    @Captor
    private ArgumentCaptor<Map<String, Object>> mapCaptor;

    @BeforeEach
    public void setUp() {
        userService = new UserService(firebaseService);
    }

    @Test
    public void testGetUserById_UserExists() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "user123";
        User mockUser = new User();
        mockUser.setUsername("testUser");
        mockUser.setStatus("online");

        when(firebaseService.get(eq("users/" + userId), eq(User.class)))
                .thenReturn(CompletableFuture.completedFuture(mockUser));

        // Execute
        CompletableFuture<Optional<UserResponse>> future = userService.getUserById(userId);
        Optional<UserResponse> result = future.get();

        // Verify
        assertTrue(result.isPresent());
        assertEquals(userId, result.get().getId());
        assertEquals(mockUser.getUsername(), result.get().getUser().getUsername());
        assertEquals(mockUser.getStatus(), result.get().getUser().getStatus());
        verify(firebaseService).get(eq("users/" + userId), eq(User.class));
    }

    @Test
    public void testGetUserById_UserDoesNotExist() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "nonExistentUser";
        when(firebaseService.get(eq("users/" + userId), eq(User.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        CompletableFuture<Optional<UserResponse>> future = userService.getUserById(userId);
        Optional<UserResponse> result = future.get();

        // Verify
        assertFalse(result.isPresent());
        verify(firebaseService).get(eq("users/" + userId), eq(User.class));
    }

    @Test
    public void testGetAllUsers() throws ExecutionException, InterruptedException {
        // Setup
        Map<String, User> mockUsersMap = new HashMap<>();
        User user1 = new User();
        user1.setUsername("user1");
        User user2 = new User();
        user2.setUsername("user2");
        mockUsersMap.put("uid1", user1);
        mockUsersMap.put("uid2", user2);

        when(firebaseService.getWithTypeIndicator(eq("users"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(mockUsersMap));

        // Execute
        CompletableFuture<List<UserResponse>> future = userService.getAllUsers();
        List<UserResponse> result = future.get();

        // Verify
        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(u -> "uid1".equals(u.getId()) && "user1".equals(u.getUser().getUsername())));
        assertTrue(result.stream().anyMatch(u -> "uid2".equals(u.getId()) && "user2".equals(u.getUser().getUsername())));
        verify(firebaseService).getWithTypeIndicator(eq("users"), any(GenericTypeIndicator.class));
    }

    @Test
    public void testUpdateUserStatus() {
        // Setup
        String userId = "user123";
        String newStatus = "away";
        when(firebaseService.update(anyString(), anyMap()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        userService.updateUserStatus(userId, newStatus);

        // Verify
        verify(firebaseService).update(eq("users/" + userId), mapCaptor.capture());
        Map<String, Object> capturedMap = mapCaptor.getValue();
        assertEquals(newStatus, capturedMap.get("status"));
    }

    @Test
    public void testAddUser() {
        // Setup
        String userId = "newUser123";
        User newUser = new User();
        newUser.setUsername("newUser");
        newUser.setStatus("offline");
        when(firebaseService.set(anyString(), any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        userService.addUser(userId, newUser);

        // Verify
        verify(firebaseService).set(eq("users/" + userId), eq(newUser));
    }

    @Test
    public void testDeleteUser() {
        // Setup
        String userId = "userToDelete";
        when(firebaseService.delete(anyString()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        userService.deleteUser(userId);

        // Verify
        verify(firebaseService).delete(eq("users/" + userId));
    }

    @Test
    public void testGetUserChats() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "user123";
        Map<String, User.ChatInfo> mockChats = new HashMap<>();
        User.ChatInfo chat1 = new User.ChatInfo();
        chat1.setTitle("Chat 1");
        mockChats.put("chat1", chat1);

        when(firebaseService.getWithTypeIndicator(eq("users/" + userId + "/chatUser"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(mockChats));

        // Execute
        CompletableFuture<Map<String, User.ChatInfo>> future = userService.getUserChats(userId);
        Map<String, User.ChatInfo> result = future.get();

        // Verify
        assertEquals(1, result.size());
        assertEquals("Chat 1", result.get("chat1").getTitle());
        verify(firebaseService).getWithTypeIndicator(eq("users/" + userId + "/chatUser"), any(GenericTypeIndicator.class));
    }

    @Test
    public void testGetUserChats_NoChats() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "userWithNoChats";
        when(firebaseService.getWithTypeIndicator(eq("users/" + userId + "/chatUser"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        CompletableFuture<Map<String, User.ChatInfo>> future = userService.getUserChats(userId);
        Map<String, User.ChatInfo> result = future.get();

        // Verify
        assertNotNull(result);
        assertTrue(result.isEmpty());
        verify(firebaseService).getWithTypeIndicator(eq("users/" + userId + "/chatUser"), any(GenericTypeIndicator.class));
    }

    @Test
    public void testMarkChatAsRead() throws ExecutionException, InterruptedException {
        // Setup
        String chatId = "chat123";
        List<String> participants = Arrays.asList("user1", "user2");
        Map<String, Map<String, Object>> messages = new HashMap<>();
        Map<String, Object> message1 = new HashMap<>();
        message1.put("read", false);
        messages.put("msg1", message1);

        // Mock participants
        when(firebaseService.getWithTypeIndicator(eq("chats/" + chatId + "/participants"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(participants));

        // Mock messages
        when(firebaseService.getWithTypeIndicator(eq("chats/" + chatId + "/messages"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(messages));

        // Mock updateMulti
        when(firebaseService.updateMulti(anyMap()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        CompletableFuture<Void> future = userService.markChatAsRead(chatId);
        future.get(); // wait for completion

        // Verify
        verify(firebaseService).getWithTypeIndicator(eq("chats/" + chatId + "/participants"), any(GenericTypeIndicator.class));
        verify(firebaseService).getWithTypeIndicator(eq("chats/" + chatId + "/messages"), any(GenericTypeIndicator.class));
        verify(firebaseService).updateMulti(mapCaptor.capture());

        Map<String, Object> updates = mapCaptor.getValue();
        assertEquals(0, updates.get("users/user1/chatUser/chat123/unreadCount"));
        assertEquals(0, updates.get("users/user2/chatUser/chat123/unreadCount"));
        assertEquals(true, updates.get("chats/chat123/messages/msg1/read"));
    }

    @Test
    public void testMarkChatAsRead_NoParticipants() {
        // Setup
        String chatId = "chatWithNoParticipants";
        when(firebaseService.getWithTypeIndicator(eq("chats/" + chatId + "/participants"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute & Verify
        CompletableFuture<Void> future = userService.markChatAsRead(chatId);
        ExecutionException exception = assertThrows(ExecutionException.class, future::get);
        assertTrue(exception.getCause() instanceof RuntimeException);
        assertTrue(exception.getCause().getMessage().contains("No participants found"));
    }

    @Test
    public void testUpdateUserBio() {
        // Setup
        String userId = "user123";
        String newBio = "My updated bio";
        when(firebaseService.update(anyString(), anyMap()))
                .thenReturn(CompletableFuture.completedFuture(null));

        // Execute
        userService.updateUserBio(userId, newBio);

        // Verify
        verify(firebaseService).update(eq("users/" + userId), mapCaptor.capture());
        Map<String, Object> updates = mapCaptor.getValue();
        assertEquals(newBio, updates.get("bio"));
    }


    @Test
    public void testVerifyHiddenChatPin_Correct() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "user123";
        String chatId = "chat123";
        String correctPin = "1234";

        User mockUser = new User();
        Map<String, Map<String, Object>> hiddenChats = new HashMap<>();
        Map<String, Object> chatInfo = new HashMap<>();
        chatInfo.put("pin", correctPin);
        hiddenChats.put(chatId, chatInfo);
        mockUser.setHiddenChats(hiddenChats);

        when(firebaseService.get(eq("users/" + userId), eq(User.class)))
                .thenReturn(CompletableFuture.completedFuture(mockUser));

        // Execute
        CompletableFuture<Boolean> future = userService.verifyHiddenChatPin(userId, chatId, correctPin);
        boolean result = future.get();

        // Verify
        assertTrue(result);
    }

    @Test
    public void testVerifyHiddenChatPin_Incorrect() throws ExecutionException, InterruptedException {
        // Setup
        String userId = "user123";
        String chatId = "chat123";
        String storedPin = "1234";
        String incorrectPin = "5678";

        User mockUser = new User();
        Map<String, Map<String, Object>> hiddenChats = new HashMap<>();
        Map<String, Object> chatInfo = new HashMap<>();
        chatInfo.put("pin", storedPin);
        hiddenChats.put(chatId, chatInfo);
        mockUser.setHiddenChats(hiddenChats);

        when(firebaseService.get(eq("users/" + userId), eq(User.class)))
                .thenReturn(CompletableFuture.completedFuture(mockUser));

        // Execute
        CompletableFuture<Boolean> future = userService.verifyHiddenChatPin(userId, chatId, incorrectPin);
        boolean result = future.get();

        // Verify
        assertFalse(result);
    }

    @Test
    public void testUpdateUserProfile() {
        // Setup
        String userId = "user123";
        String firstName = "John";
        String lastName = "Doe";
        String avatar = "avatar_url";
        String fullName = "John Doe";

        User mockUser = new User();
        mockUser.setUsername("oldUsername");

        when(firebaseService.get(eq("users/" + userId), eq(User.class)))
                .thenReturn(CompletableFuture.completedFuture(mockUser));

        when(firebaseService.set(anyString(), any(User.class)))
                .thenReturn(CompletableFuture.completedFuture(null));

        Map<String, User.ChatInfo> chatUserMap = new HashMap<>();
        User.ChatInfo chatInfo = new User.ChatInfo();
        chatUserMap.put("chat1", chatInfo);

        when(firebaseService.getWithTypeIndicator(eq("users/" + userId + "/chatUser"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(chatUserMap));

        when(firebaseService.get(eq("chats/chat1/type"), eq(String.class)))
                .thenReturn(CompletableFuture.completedFuture("individual"));

        List<String> participants = Arrays.asList(userId, "otherUser");
        when(firebaseService.getWithTypeIndicator(eq("chats/chat1/participants"), any(GenericTypeIndicator.class)))
                .thenReturn(CompletableFuture.completedFuture(participants));

        // Execute
        userService.updateUserProfile(userId, firstName, lastName, avatar);


        // Verify chat title update for other user
        verify(firebaseService).set(eq("users/otherUser/chatUser/chat1/title"), eq(fullName));
    }
}