package com.example.bicoChat_backend.config.firebase;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;

@Configuration
public class FirebaseConfig {
    @PostConstruct
    public void initialize() {
        FirebaseOptions options;
        try {
            // Initialize Firebase Admin SDK
            if (System.getenv("FIREBASE_CREDENTIALS") != null) {
                // Using environment variable
                InputStream credentialsStream = new ByteArrayInputStream(
                        System.getenv("FIREBASE_CREDENTIALS").getBytes(StandardCharsets.UTF_8)
                );
                options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                        .build();
            } else {
                // If the json file is present
                FileInputStream serviceAccount = new FileInputStream("resources/bico-chat-firebase-adminsdk-fbsvc-387ac0c5d6.json");
                options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();
            }
            FirebaseApp.initializeApp(options);
        } catch (IOException e) {
            System.err.println("Firebase initialization error: " + e.getMessage());
        }
    }
}