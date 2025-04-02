package com.example.bicoChat_backend.config.firebase;


import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.cloud.FirestoreClient;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.cloud.StorageClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;

@Configuration
public class FirebaseBeansConfig {

    /**
     * Bean per Firestore (database NoSQL)
     */
    @Bean
    @DependsOn("firebaseApp")
    public Firestore firestoreDatabase() {
        return FirestoreClient.getFirestore();
    }

    /**
     * Bean per Firebase Authentication
     */
    @Bean
    @DependsOn("firebaseApp")
    public FirebaseAuth firebaseAuth() {
        return FirebaseAuth.getInstance();
    }

    /**
     * Bean per Realtime Database
     */
    @Bean
    @DependsOn("firebaseApp")
    public DatabaseReference firebaseDatabase() {
        return FirebaseDatabase.getInstance().getReference();
    }

    /**
     * Bean per Firebase Storage
     */
    @Bean
    @DependsOn("firebaseApp")
    public StorageClient firebaseStorage() {
        return StorageClient.getInstance();
    }

    /**
     * Bean per Firebase Cloud Messaging
     */
    @Bean
    @DependsOn("firebaseApp")
    public FirebaseMessaging firebaseMessaging() {
        return FirebaseMessaging.getInstance();
    }
}