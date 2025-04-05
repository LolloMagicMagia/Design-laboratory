package com.example.bicoChat_backend.service.google;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import com.google.firebase.auth.UserRecord.CreateRequest;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
public class GoogleAuthService {

    /**
     * Verifies the Google token ID and gets user's information
     * @param idToken Google token ID.
     * @return user's authenticated data.
     */
    public Map<String, Object> verifyGoogleToken(String idToken) {
        try {
            // Using firebase to verify the Google token ID
            FirebaseToken decodedToken = FirebaseAuth.getInstance().verifyIdToken(idToken);

            UserRecord userRecord;
            try {
                // Obtains the user's data from Firebase if present
                userRecord = FirebaseAuth.getInstance().getUser(decodedToken.getUid());
            } catch (FirebaseAuthException e) {
                // Create the user's data on Firebase if it's not present
                CreateRequest request = new CreateRequest()
                        .setUid(decodedToken.getUid())
                        .setEmail(decodedToken.getEmail())
                        .setDisplayName(decodedToken.getName())
                        .setPhotoUrl(decodedToken.getPicture())
                        .setEmailVerified(decodedToken.isEmailVerified());

                userRecord = FirebaseAuth.getInstance().createUser(request);
            }

            // Creates a custom token if necessary on firebase
            String customToken = FirebaseAuth.getInstance().createCustomToken(userRecord.getUid());

            // Prepares the user's data to return
            Map<String, Object> userData = new HashMap<>();
            userData.put("uid", userRecord.getUid());
            userData.put("email", userRecord.getEmail());
            userData.put("name", userRecord.getDisplayName());
            userData.put("pictureUrl", userRecord.getPhotoUrl());
            userData.put("customToken", customToken);

            return userData;
        } catch (FirebaseAuthException e) {
            System.err.println("Firebase authentication error: " + e.getMessage());
            throw new IllegalArgumentException("Google Token ID not valid: " + e.getMessage(), e);
        }
    }

    /**
     * Testing method to verify is the services are working.
     * @return Confirmation string.
     */
    public String testService() {
        return "Google Auth Service correctly working!";
    }

    /**
     * Gets the user's information, given the UID
     * @param uid User's UID
     * @return A string with the information.
     */
    public String getUserInfo(String uid) {
        try {
            UserRecord userRecord = FirebaseAuth.getInstance().getUser(uid);
            return "User Found: " + userRecord.getDisplayName() + " (" + userRecord.getEmail() + ")";
        } catch (FirebaseAuthException e) {
            return "User not Found: " + e.getMessage();
        }
    }
}

