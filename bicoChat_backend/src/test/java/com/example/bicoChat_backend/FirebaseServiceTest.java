package com.example.bicoChat_backend;

import com.example.bicoChat_backend.service.FirebaseService;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.database.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class FirebaseServiceTest {

    @Mock
    private DatabaseReference databaseReference;

    @Mock
    private DatabaseReference childReference;

    @Mock
    private DataSnapshot dataSnapshot;

    private FirebaseService firebaseService;

    @BeforeEach
    public void setUp() {
        when(databaseReference.child(anyString())).thenReturn(childReference);
        firebaseService = new FirebaseService(databaseReference);
    }

    @Test
    public void testGet_WithClass_Success() throws ExecutionException, InterruptedException {
        // Setup
        String testPath = "users/123";
        String expectedValue = "test-value";

        // Mock behavior
        doAnswer(invocation -> {
            ValueEventListener listener = invocation.getArgument(0);
            when(dataSnapshot.getValue(String.class)).thenReturn(expectedValue);
            listener.onDataChange(dataSnapshot);
            return null;
        }).when(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));

        // Execute
        CompletableFuture<String> result = firebaseService.get(testPath, String.class);

        // Verify
        assertEquals(expectedValue, result.get());
        verify(databaseReference).child(testPath);
        verify(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));
    }


    @Test
    public void testExists_True() throws ExecutionException, InterruptedException {
        // Setup
        String testPath = "users/123";

        // Mock behavior
        doAnswer(invocation -> {
            ValueEventListener listener = invocation.getArgument(0);
            when(dataSnapshot.exists()).thenReturn(true);
            listener.onDataChange(dataSnapshot);
            return null;
        }).when(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));

        // Execute
        CompletableFuture<Boolean> result = firebaseService.exists(testPath);

        // Verify
        assertTrue(result.get());
        verify(databaseReference).child(testPath);
        verify(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));
    }

    @Test
    public void testExists_False() throws ExecutionException, InterruptedException {
        // Setup
        String testPath = "users/123";

        // Mock behavior
        doAnswer(invocation -> {
            ValueEventListener listener = invocation.getArgument(0);
            when(dataSnapshot.exists()).thenReturn(false);
            listener.onDataChange(dataSnapshot);
            return null;
        }).when(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));

        // Execute
        CompletableFuture<Boolean> result = firebaseService.exists(testPath);

        // Verify
        assertFalse(result.get());
        verify(databaseReference).child(testPath);
        verify(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));
    }



    @Test
    public void testDelete() {
        // Setup
        String testPath = "users/123";

        // Execute
        firebaseService.delete(testPath);

        // Verify that delete calls set with null
        verify(childReference).setValue(eq(null), any(DatabaseReference.CompletionListener.class));
    }

    @Test
    public void testGetWithDataSnapshot() throws ExecutionException, InterruptedException {
        // Setup
        String testPath = "users/123";

        // Mock behavior
        doAnswer(invocation -> {
            ValueEventListener listener = invocation.getArgument(0);
            listener.onDataChange(dataSnapshot);
            return null;
        }).when(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));

        // Execute
        CompletableFuture<DataSnapshot> result = firebaseService.get(testPath);

        // Verify
        assertEquals(dataSnapshot, result.get());
        verify(databaseReference).child(testPath);
        verify(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));
    }

    @Test
    public void testGetWithTypeIndicator() throws ExecutionException, InterruptedException {
        // Setup
        String testPath = "users";
        GenericTypeIndicator<Map<String, Object>> typeIndicator = new GenericTypeIndicator<Map<String, Object>>() {};
        Map<String, Object> expectedData = new HashMap<>();
        expectedData.put("user1", "data1");

        // Mock behavior
        doAnswer(invocation -> {
            ValueEventListener listener = invocation.getArgument(0);
            when(dataSnapshot.getValue(any(GenericTypeIndicator.class))).thenReturn(expectedData);
            listener.onDataChange(dataSnapshot);
            return null;
        }).when(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));

        // Execute
        CompletableFuture<Map<String, Object>> result = firebaseService.getWithTypeIndicator(testPath, typeIndicator);

        // Verify
        assertEquals(expectedData, result.get());
        verify(databaseReference).child(testPath);
        verify(childReference).addListenerForSingleValueEvent(any(ValueEventListener.class));
    }

    @Test
    public void testListenToUsersChanges() {
        // Setup
        ValueEventListener listener = mock(ValueEventListener.class);
        DatabaseReference usersRef = mock(DatabaseReference.class);
        when(databaseReference.child("users")).thenReturn(usersRef);

        // Execute
        firebaseService.listenToUsersChanges(listener);

        // Verify
        verify(databaseReference).child("users");
        verify(usersRef).addValueEventListener(listener);
    }
}