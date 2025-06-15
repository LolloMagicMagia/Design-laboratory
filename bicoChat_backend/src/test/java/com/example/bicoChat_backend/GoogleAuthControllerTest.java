package com.example.bicoChat_backend;

import com.example.bicoChat_backend.controller.google.GoogleAuthController;
import com.example.bicoChat_backend.service.google.GoogleAuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class GoogleAuthControllerTest {

    @Mock
    private GoogleAuthService googleAuthService;

    @InjectMocks
    private GoogleAuthController googleAuthController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void authenticateWithGoogle_ValidToken_ReturnsUserData() throws Exception {
        // Arrange
        Map<String, String> request = new HashMap<>();
        String validToken = "valid_google_token";
        request.put("idToken", validToken);

        Map<String, Object> expectedUserData = new HashMap<>();
        expectedUserData.put("email", "test@example.com");
        expectedUserData.put("name", "Test User");
        expectedUserData.put("picture", "https://example.com/profile.jpg");

        when(googleAuthService.verifyGoogleToken(validToken)).thenReturn(expectedUserData);

        // Act
        ResponseEntity<?> response = googleAuthController.authenticateWithGoogle(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedUserData, response.getBody());
        verify(googleAuthService, times(1)).verifyGoogleToken(validToken);
    }

    @Test
    void authenticateWithGoogle_EmptyToken_ReturnsBadRequest() {
        // Arrange
        Map<String, String> request = new HashMap<>();
        request.put("idToken", "");

        // Act
        ResponseEntity<?> response = googleAuthController.authenticateWithGoogle(request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Token Google not provided", response.getBody());
        verify(googleAuthService, never()).verifyGoogleToken(anyString());
    }

    @Test
    void authenticateWithGoogle_NullToken_ReturnsBadRequest() {
        // Arrange
        Map<String, String> request = new HashMap<>();
        request.put("idToken", null);

        // Act
        ResponseEntity<?> response = googleAuthController.authenticateWithGoogle(request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Token Google not provided", response.getBody());
        verify(googleAuthService, never()).verifyGoogleToken(anyString());
    }

    @Test
    void authenticateWithGoogle_NoTokenKey_ReturnsBadRequest() {
        // Arrange
        Map<String, String> request = new HashMap<>();
        // No idToken key in the request

        // Act
        ResponseEntity<?> response = googleAuthController.authenticateWithGoogle(request);

        // Assert
        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Token Google not provided", response.getBody());
        verify(googleAuthService, never()).verifyGoogleToken(anyString());
    }

    @Test
    void authenticateWithGoogle_ServiceThrowsException_ReturnsUnauthorized() throws Exception {
        // Arrange
        Map<String, String> request = new HashMap<>();
        String invalidToken = "invalid_token";
        request.put("idToken", invalidToken);

        String errorMessage = "Token validation failed";
        when(googleAuthService.verifyGoogleToken(invalidToken)).thenThrow(new RuntimeException(errorMessage));

        // Act
        ResponseEntity<?> response = googleAuthController.authenticateWithGoogle(request);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("Authentication failed: " + errorMessage, response.getBody());
        verify(googleAuthService, times(1)).verifyGoogleToken(invalidToken);
    }
}