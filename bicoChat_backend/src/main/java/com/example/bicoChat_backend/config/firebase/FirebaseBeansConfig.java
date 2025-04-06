package com.example.bicoChat_backend.config.firebase;


import org.springframework.beans.factory.annotation.Value;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.cloud.StorageClient;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.DependsOn;

@Configuration
public class FirebaseBeansConfig {


    @Value("${DATABASE_URL}")
    private String databaseUrl;


/* Firestore

    @Bean
    @DependsOn("firebaseApp")
    public Firestore firestoreDatabase() {
        return FirestoreClient.getFirestore();
    }
*/

    /**
     * Bean for Firebase Authentication
     */
    @Bean
    @DependsOn("firebaseApp")
    public FirebaseAuth firebaseAuth() {
        return FirebaseAuth.getInstance();
    }

    /**
     * Bean for Realtime Database
     */
    @Bean
    @DependsOn("firebaseApp")
    public DatabaseReference firebaseDatabase() {
        return FirebaseDatabase.getInstance(databaseUrl).getReference();
    }

    /**
     * Bean for Firebase Storage
     */
    @Bean
    @DependsOn("firebaseApp")
    public StorageClient firebaseStorage() {
        return StorageClient.getInstance();
    }

    /*
     * Bean for Firebase Cloud Messaging

    @Bean
    @DependsOn("firebaseApp")
    public FirebaseMessaging firebaseMessaging() {
        return FirebaseMessaging.getInstance();
    }

     */
}

