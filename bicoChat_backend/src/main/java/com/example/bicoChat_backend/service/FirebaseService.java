package com.example.bicoChat_backend.service;

import com.google.firebase.auth.UserRecord;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * FirebaseService class provides methods to interact with Firebase Realtime Database.
 * It includes functions for getting, setting, updating, deleting, and listening to data changes in Firebase.
 */
@Service
public class FirebaseService {

    private final DatabaseReference databaseReference;

    @Autowired
    public FirebaseService(DatabaseReference databaseReference) {
        this.databaseReference = databaseReference;
    }

    /**
     * Returns the Firebase Database reference object for direct access.
     *
     * @return Firebase DatabaseReference.
     */
    public DatabaseReference getDatabaseReference() {
        return databaseReference;
    }

    /**
     * Get data from Firebase at the specified path and convert to the given type.
     *
     * @param path Firebase database path.
     * @param valueType Class to convert the data to.
     * @param <T> Type parameter.
     * @return CompletableFuture with the result.
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
     * Set data in Firebase at the specified path.
     *
     * @param path Firebase database path.
     * @param value Value to set.
     * @param <T> Type parameter.
     * @return CompletableFuture that completes when the operation is done.
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
     * Check if data exists at the specified path.
     *
     * @param path Firebase database path.
     * @return CompletableFuture with boolean result indicating existence.
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
     * Update specific fields at the given path with a map of updates.
     *
     * @param path Firebase database path.
     * @param updates Map of updates to apply.
     * @return CompletableFuture that completes when the operation is done.
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
     * Delete data at the specified path by setting the value to null.
     *
     * @param path Firebase database path.
     * @return CompletableFuture that completes when the operation is done.
     */
    public CompletableFuture<Void> delete(String path) {
        return set(path, null);
    }

    /**
     * Get data with a specific type indicator for complex generic types.
     *
     * @param path Firebase database path.
     * @param typeIndicator GenericTypeIndicator for the expected data type.
     * @param <T> Type parameter.
     * @return CompletableFuture with the result.
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
     * Update multiple paths at once using a map of updates.
     *
     * @param updates Map of updates to apply.
     * @return CompletableFuture that completes when the operation is done.
     */
    public CompletableFuture<Void> updateMulti(Map<String, Object> updates) {
        CompletableFuture<Void> future = new CompletableFuture<>();

        // Use the updateChildren method to apply updates to multiple paths simultaneously
        databaseReference.updateChildren(updates, (error, ref) -> {
            if (error != null) {
                future.completeExceptionally(error.toException());
            } else {
                future.complete(null);
            }
        });

        return future;
    }

    /**
     * Listens for changes in the "users" node and updates the provided listener.
     *
     * @param listener ValueEventListener to handle data changes.
     */
    public void listenToUsersChanges(ValueEventListener listener) {
        databaseReference.child("users").addValueEventListener(listener);
    }

    /**
     * Patch method that applies a set of updates to multiple paths, equivalent to updateMulti.
     *
     * @param updates Map of updates to apply.
     * @return CompletableFuture that completes when the operation is done.
     */
    public CompletableFuture<Void> patch(Map<String, Object> updates) {
        return updateMulti(updates);
    }

    /**
     * Retrieves data at the given path as a DataSnapshot.
     *
     * @param path Firebase database path.
     * @return CompletableFuture with the DataSnapshot result.
     */
    public CompletableFuture<DataSnapshot> get(String path) {
        CompletableFuture<DataSnapshot> future = new CompletableFuture<>();

        databaseReference.child(path).addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot dataSnapshot) {
                future.complete(dataSnapshot);
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
