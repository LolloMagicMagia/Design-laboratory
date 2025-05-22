package com.example.bicoChat_backend.service.user;

import com.example.bicoChat_backend.dto.request.UserRegisterRequest;
import com.example.bicoChat_backend.service.FirebaseService;
import com.google.firebase.auth.*;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.UserRecord.CreateRequest;

import org.json.JSONObject;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.mail.SimpleMailMessage;

import java.util.HashMap;
import java.util.Map;

@Service
public class RegistrationService {

    @Autowired
    private JavaMailSender emailSender;

    @Autowired
    private FirebaseService firebaseService;

    public void listAllUsers() throws Exception {
        ListUsersPage page = FirebaseAuth.getInstance().listUsers(null);
        for (UserRecord user : page.iterateAll()) {
            System.out.println("User: " + user.getEmail());
        }
    }

    public String creteUnverifiedUser(@RequestParam String email, @RequestParam String password) throws FirebaseAuthException {
        try {
            // Check if the user already exists in Firebase
            UserRecord existingUser = FirebaseAuth.getInstance().getUserByEmail(email);
            if (existingUser.isEmailVerified()) {
                return "Error: This email is already registered and verified.";
            } else {
                return "Error: This email is already registered but not verified. Please check your inbox.";
            }
        } catch (FirebaseAuthException e) {
            // If user is not found, create a new unverified user
            if (e.getAuthErrorCode() == AuthErrorCode.USER_NOT_FOUND) {
                try {
                    // Create a new unverified user
                    CreateRequest request = new CreateRequest()
                            .setEmail(email)
                            .setEmailVerified(false)
                            .setPassword(password);

                    UserRecord userRecord = FirebaseAuth.getInstance().createUser(request);
                    // Add the user on realtime DB
                    firebaseService.initializeUserIfMissing(userRecord);
                    return "Successfully created new unverified user: " + userRecord.getEmail();
                } catch (FirebaseAuthException ex) {
                    return "Error creating user: " + ex.getMessage();
                }
            } else {
                return "Error checking user: " + e.getMessage();
            }
        }
    }

    public String verifyUser(@RequestParam String email) throws FirebaseAuthException {
        UserRecord existingUser = FirebaseAuth.getInstance().getUserByEmail(email);
        if (existingUser.isEmailVerified() || existingUser.getEmail().isEmpty()) {
            return "Error: This email is already registered";
        }
        try {
            // generate the verification link
            String verificationLink = FirebaseAuth.getInstance().generateEmailVerificationLink(email);

            sendVerificationEmail(email, verificationLink);
            //System.out.println("Verification email sent: " + verificationLink);

            return "Verification email sent successfully to: " + email;
        } catch (FirebaseAuthException e) {
            return "Error: " + e.getMessage();
        }
    }

    private void sendVerificationEmail(String email, String verificationLink) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(email);
        message.setSubject("Verify Your Email - Firebase");
        message.setText("Click the link below to verify your email:\n" + verificationLink);

        emailSender.send(message);
    }

    public ResponseEntity<Object> login(@RequestBody UserRegisterRequest user) {
        String apiKey = System.getenv("FIREBASE_API_KEY");
        String firebaseUrl = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + apiKey;

        JSONObject request = new JSONObject();
        request.put("email", user.getEmail());
        request.put("password", user.getPassword());
        request.put("returnSecureToken", true);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<String> entity = new HttpEntity<>(request.toString(), headers);

        RestTemplate restTemplate = new RestTemplate();

        try {
            // Call Firebase
            ResponseEntity<String> response = restTemplate.postForEntity(firebaseUrl, entity, String.class);

            // If firebase response is ok, send to frontend
            JSONObject firebaseResponse = new JSONObject(response.getBody());
            String uid = firebaseResponse.getString("localId");  // Firebase uid
            String email = firebaseResponse.getString("email");

            // Send data to frontend
            Map<String, String> userData = new HashMap<>();
            userData.put("uid", uid);
            userData.put("email", email);

            return ResponseEntity.ok(userData);  // Format JSON
        } catch (HttpClientErrorException e) {
            // Error handling
            String errorMessage = "Error during login";
            if (e.getStatusCode() == HttpStatus.BAD_REQUEST) {
                String body = e.getResponseBodyAsString();
                if (body.contains("INVALID_LOGIN_CREDENTIALS")) {
                    errorMessage = "Password or email wrong";
                }
            }

            // Return custom error
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(errorMessage);
        } catch (Exception e) {
            // For other errors
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Error during login: " + e.getMessage());
        }
    }



    public ResponseEntity<String> logout(@RequestParam String email) {
        try {
            UserRecord userRecord = FirebaseAuth.getInstance().getUserByEmail(email);
            String uid = userRecord.getUid();
            FirebaseAuth.getInstance().revokeRefreshTokens(uid);
            return ResponseEntity.ok("User logged out successfully.");
        } catch (FirebaseAuthException e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Logout failed: " + e.getMessage());
        }
    }


}