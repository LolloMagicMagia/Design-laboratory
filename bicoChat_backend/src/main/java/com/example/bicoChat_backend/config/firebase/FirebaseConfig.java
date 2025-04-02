package com.example.bicoChat_backend.config.firebase;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Configuration
public class FirebaseConfig {

    @Value("${PRIVATE_KEY_ID}")
    private String private_key_id;

    @Value("${PRIVATE_KEY}")
    private String private_key;

    @Value("${CLIENT_EMAIL}")
    private String client_email;

    @Value("${CLIENT_ID}")
    private String client_id;

    @Value("${AUTH_ID}")
    private String auth_uri;

    @Value("${TOKEN_URI}")
    private String token_uri;

    @Value("${AUTH_PROVIDER_X509_CERT_URL}")
    private String auth_provider_x509_cert_url;

    @Value("${CLIENT_X509_CERT_URL}")
    private String client_x509_cert_url;

    private String type;

    private String project_id;

    private String universe_domain;

    public FirebaseConfig(){
        this.type = "service_account";
        this.project_id = "bico-chat";
        this.universe_domain = "googleapis.com";
    }


    @Bean
    public FirebaseApp firebaseApp() throws IOException {
        if (FirebaseApp.getApps().isEmpty()) {
            // Costruisci il file JSON delle credenziali in memoria
            Map<String, Object> credentialsMap = new HashMap<>();
            credentialsMap.put("type", type);
            credentialsMap.put("project_id", project_id);
            credentialsMap.put("private_key_id", private_key_id);
            credentialsMap.put("private_key", private_key.replace("\\n", "\n"));
            credentialsMap.put("client_email", client_email);
            credentialsMap.put("client_id", client_id);
            credentialsMap.put("auth_uri", auth_uri);
            credentialsMap.put("token_uri", token_uri);
            credentialsMap.put("auth_provider_x509_cert_url", auth_provider_x509_cert_url);
            credentialsMap.put("client_x509_cert_url", client_x509_cert_url);
            credentialsMap.put("universe_domain", universe_domain);

            // Converti la mappa in JSON
            String jsonCredentials = new ObjectMapper().writeValueAsString(credentialsMap);

            // Crea InputStream dalle credenziali JSON
            InputStream credentialsStream = new ByteArrayInputStream(jsonCredentials.getBytes());

            // Configura le opzioni di Firebase
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .build();

            // Inizializza l'app
            return FirebaseApp.initializeApp(options);
        } else {
            return FirebaseApp.getInstance();
        }
    }

/*
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

 */
}