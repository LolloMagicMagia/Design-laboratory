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

    @Value("${AUTH_URI}")
    private String auth_uri;

    @Value("${TOKEN_URI}")
    private String token_uri;

    @Value("${AUTH_PROVIDER_X509_CERT_URL}")
    private String auth_provider_x509_cert_url;

    @Value("${CLIENT_X509_CERT_URL}")
    private String client_x509_cert_url;

    @Value("${DATABASE_URL}")
    private String database_url;

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
            // Building the JSON file
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

            // Convert to JSON
            String jsonCredentials = new ObjectMapper().writeValueAsString(credentialsMap);

            InputStream credentialsStream = new ByteArrayInputStream(jsonCredentials.getBytes());

            // Firebase Config
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(credentialsStream))
                    .setDatabaseUrl(database_url)
                    .build();

            // App initialization
            return FirebaseApp.initializeApp(options);
        } else {
            return FirebaseApp.getInstance();
        }
    }
}