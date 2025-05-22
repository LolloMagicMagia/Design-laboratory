package com.example.bicoChat_backend.service;

import com.google.firebase.auth.UserRecord;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
public class FirebaseService {

    private final DatabaseReference databaseReference;

    @Autowired
    public FirebaseService(DatabaseReference databaseReference) {
        this.databaseReference = databaseReference;
    }

    public DatabaseReference getDatabaseReference() {
        return databaseReference;
    }


    /**
     * Get data from Firebase at the specified path and convert to the given type
     * @param path Firebase database path
     * @param valueType Class to convert the data to
     * @param <T> Type parameter
     * @return CompletableFuture with the result
     */
    public <T> CompletableFuture<T> get(String path, Class<T> valueType) {
        CompletableFuture<T> future = new CompletableFuture<>();

        databaseReference.child(path).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                future.complete(dataSnapshot.getValue(valueType));
            }

            @Override
            public void onCancelled(DatabaseError error) {
                future.completeExceptionally(error.toException());
            }
        });

        return future;
    }

    /**
     * Set data in Firebase at the specified path
     * @param path Firebase database path
     * @param value Value to set
     * @param <T> Type parameter
     * @return CompletableFuture that completes when the operation is done
     */
    public <T> CompletableFuture<Void> set(String path, T value) {
        CompletableFuture<Void> future = new CompletableFuture<>();

        databaseReference.child(path).setValue(value, (error, ref) -> {
            if (error != null) {
                future.completeExceptionally(error.toException());
            } else {
                future.complete(null);
            }
        });

        return future;
    }

    /**
     * Check if data exists at the specified path
     * @param path Firebase database path
     * @return CompletableFuture with boolean result
     */
    public CompletableFuture<Boolean> exists(String path) {
        CompletableFuture<Boolean> future = new CompletableFuture<>();

        databaseReference.child(path).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                future.complete(dataSnapshot.exists());
            }

            @Override
            public void onCancelled(DatabaseError error) {
                future.completeExceptionally(error.toException());
            }
        });

        return future;
    }

    /**
     * Update specific fields at the given path
     * @param path Firebase database path
     * @param updates Map of updates to apply
     * @return CompletableFuture that completes when the operation is done
     */
    public CompletableFuture<Void> update(String path, Map<String, Object> updates) {
        CompletableFuture<Void> future = new CompletableFuture<>();

        databaseReference.child(path).updateChildren(updates, (error, ref) -> {
            if (error != null) {
                future.completeExceptionally(error.toException());
            } else {
                future.complete(null);
            }
        });

        return future;
    }

    /**
     * Delete data at the specified path
     * @param path Firebase database path
     * @return CompletableFuture that completes when the operation is done
     */
    public CompletableFuture<Void> delete(String path) {
        return set(path, null);
    }

    /**
     * Get data with a specific type indicator for complex generic types
     * @param path Firebase database path
     * @param typeIndicator GenericTypeIndicator for the expected data type
     * @param <T> Type parameter
     * @return CompletableFuture with the result
     */
    public <T> CompletableFuture<T> getWithTypeIndicator(String path, GenericTypeIndicator<T> typeIndicator) {
        CompletableFuture<T> future = new CompletableFuture<>();

        databaseReference.child(path).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                T value = dataSnapshot.getValue(typeIndicator);
                future.complete(value);
            }

            @Override
            public void onCancelled(DatabaseError error) {
                future.completeExceptionally(error.toException());
            }
        });

        return future;
    }


    /**
     * Initializes a user in Firebase if they do not already exist.
     *
     * @param userRecord Firebase user record.
     */
    public void initializeUserIfMissing(UserRecord userRecord) {
        String uid = userRecord.getUid();
        DatabaseReference userRef = databaseReference.child("users/" + uid);

        userRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (!snapshot.exists()) {
                    Map<String, Object> userData = getStringObjectMap(userRecord);
                    userData.put("email", userRecord.getEmail());
                    userRef.setValueAsync(userData);
                    System.out.println("User created on Realtime DB: " + uid);
                } else {
                    String dbEmail = snapshot.child("email").getValue(String.class);
                    String authEmail = userRecord.getEmail();
                    if (authEmail != null && (dbEmail == null || !authEmail.equals(dbEmail))) {
                        userRef.child("email").setValueAsync(authEmail);
                    }
                    System.out.println("User already present on Realtime DB: " + uid);
                }
            }

            @Override
            public void onCancelled(DatabaseError error) {
                System.err.println("Error during user handling: " + error.getMessage());
            }
        });
    }


    public void listenToUsersChanges(ValueEventListener listener) {
        databaseReference.child("users").addValueEventListener(listener);
    }


    /**
     * Converts user data from FirebaseUserRecord to a map format for Firebase Realtime Database.
     *
     * @param userRecord Firebase user record.
     * @return Map containing user data.
     */
    private static Map<String, Object> getStringObjectMap(UserRecord userRecord) {
        String username;
        if (userRecord.getDisplayName() != null && !userRecord.getDisplayName().isEmpty()) {
            username = userRecord.getDisplayName(); // Google Auth
        } else if (userRecord.getEmail() != null) {
            username = userRecord.getEmail(); // Email/pass
        } else {
            username = "Unknown User";
        }
        Map<String, Object> userData = new HashMap<>();
        userData.put("status", "offline");
        userData.put("username", username);
        return userData;
    }
}