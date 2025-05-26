package com.example.bicoChat_backend;

import com.example.bicoChat_backend.controller.user.RegistrationController;
import com.example.bicoChat_backend.dto.request.UserRegisterRequest;
import com.example.bicoChat_backend.service.user.RegistrationService;
import com.google.firebase.auth.FirebaseAuthException;
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

class RegistrationControllerTest {

    @Mock
    private RegistrationService registrationService;

    @InjectMocks
    private RegistrationController registrationController;

    @BeforeEach
    void setUp() {
        MockitoAnnotations.openMocks(this);
    }

    @Test
    void getUsers_Success_ReturnsConsoleMessage() throws Exception {
        // Arrange
        doNothing().when(registrationService).listAllUsers();

        // Act
        String result = registrationController.getUsers();

        // Assert
        assertEquals("Check console for users!", result);
        verify(registrationService, times(1)).listAllUsers();
    }

    @Test
    void getUsers_Exception_ReturnsErrorMessage() throws Exception {
        // Arrange
        String errorMessage = "Firebase error: Database connection failed";
        doThrow(new Exception(errorMessage)).when(registrationService).listAllUsers();

        // Act
        String result = registrationController.getUsers();

        // Assert
        assertEquals("Error: " + errorMessage, result);
        verify(registrationService, times(1)).listAllUsers();
    }

    @Test
    void createUser_Success_ReturnsOkResponse() throws FirebaseAuthException {
        // Arrange
        UserRegisterRequest request = new UserRegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");
        String expectedResult = "Successfully created new unverified user: test@example.com";

        when(registrationService.creteUnverifiedUser(request.getEmail(), request.getPassword()))
                .thenReturn(expectedResult);

        // Act
        ResponseEntity<?> response = registrationController.createUser(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResult, response.getBody());
        verify(registrationService, times(1))
                .creteUnverifiedUser(request.getEmail(), request.getPassword());
    }

    @Test
    void createUser_UserAlreadyExists_ReturnsOkResponseWithMessage() throws FirebaseAuthException {
        // Arrange
        UserRegisterRequest request = new UserRegisterRequest();
        request.setEmail("existing@example.com");
        request.setPassword("password123");
        String expectedResult = "Error: This email is already registered but not verified. Please check your inbox.";

        when(registrationService.creteUnverifiedUser(request.getEmail(), request.getPassword()))
                .thenReturn(expectedResult);

        // Act
        ResponseEntity<?> response = registrationController.createUser(request);

        // Assert
        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertEquals(expectedResult, response.getBody());
    }

    @Test
    void createUser_FirebaseException_ReturnsInternalServerError() throws FirebaseAuthException {
        // Arrange
        UserRegisterRequest request = new UserRegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");
        FirebaseAuthException firebaseException = mock(FirebaseAuthException.class);
        when(firebaseException.getMessage()).thenReturn("Firebase authentication error");

        when(registrationService.creteUnverifiedUser(request.getEmail(), request.getPassword()))
                .thenThrow(firebaseException);

        // Act
        ResponseEntity<?> response = registrationController.createUser(request);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("Firebase authentication error", response.getBody());
    }

    @Test
    void verifyUser_Success_ReturnsSuccessMessage() throws FirebaseAuthException {
        // Arrange
        String email = "test@example.com";
        String expectedResult = "Verification email sent successfully to: test@example.com";

        when(registrationService.verifyUser(email)).thenReturn(expectedResult);

        // Act
        String result = registrationController.verifyUser(email);

        // Assert
        assertEquals(expectedResult, result);
        verify(registrationService, times(1)).verifyUser(email);
    }

    @Test
    void verifyUser_FirebaseException_ReturnsErrorMessage() throws FirebaseAuthException {
        // Arrange
        String email = "test@example.com";
        String errorMessage = "User not found";
        FirebaseAuthException firebaseException = mock(FirebaseAuthException.class);
        when(firebaseException.getMessage()).thenReturn(errorMessage);

        when(registrationService.verifyUser(email)).thenThrow(firebaseException);

        // Act
        String result = registrationController.verifyUser(email);

        // Assert
        assertEquals("Error: " + errorMessage, result);
        verify(registrationService, times(1)).verifyUser(email);
    }

    @Test
    void login_Success_ReturnsUserData() {
        // Arrange
        UserRegisterRequest request = new UserRegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("password123");

        Map<String, String> userData = new HashMap<>();
        userData.put("uid", "user123");
        userData.put("email", "test@example.com");
        ResponseEntity<Object> expectedResponse = ResponseEntity.ok(userData);

        when(registrationService.login(request)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<Object> result = registrationController.login(request);

        // Assert
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals(userData, result.getBody());
        verify(registrationService, times(1)).login(request);
    }

    @Test
    void login_InvalidCredentials_ReturnsUnauthorized() {
        // Arrange
        UserRegisterRequest request = new UserRegisterRequest();
        request.setEmail("test@example.com");
        request.setPassword("wrongpassword");

        ResponseEntity<Object> expectedResponse = ResponseEntity
                .status(HttpStatus.UNAUTHORIZED)
                .body("Password or email wrong");

        when(registrationService.login(request)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<Object> result = registrationController.login(request);

        // Assert
        assertEquals(HttpStatus.UNAUTHORIZED, result.getStatusCode());
        assertEquals("Password or email wrong", result.getBody());
        verify(registrationService, times(1)).login(request);
    }

    @Test
    void logout_Success_ReturnsOkResponse() {
        // Arrange
        String email = "test@example.com";
        ResponseEntity<String> expectedResponse = ResponseEntity.ok("User logged out successfully.");

        when(registrationService.logout(email)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<String> result = registrationController.logout(email);

        // Assert
        assertEquals(HttpStatus.OK, result.getStatusCode());
        assertEquals("User logged out successfully.", result.getBody());
        verify(registrationService, times(1)).logout(email);
    }

    @Test
    void logout_UserNotFound_ReturnsInternalServerError() {
        // Arrange
        String email = "nonexistent@example.com";
        ResponseEntity<String> expectedResponse = ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Logout failed: USER_NOT_FOUND");

        when(registrationService.logout(email)).thenReturn(expectedResponse);

        // Act
        ResponseEntity<String> result = registrationController.logout(email);

        // Assert
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, result.getStatusCode());
        assertEquals("Logout failed: USER_NOT_FOUND", result.getBody());
        verify(registrationService, times(1)).logout(email);
    }
}