package com.example.bicoChat_backend.service;

import com.example.bicoChat_backend.dto.response.FriendResponseDTO;
import com.example.bicoChat_backend.model.User;
import com.google.firebase.database.GenericTypeIndicator;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.CompletableFuture;

/**
 * Service for handling user friendship-related operations in the system.
 * This includes retrieving friends, sending/accepting/rejecting friend requests.
 */
@Service
public class FriendService {

    private static final String USERS_PATH = "users";

    @Autowired
    private FirebaseService firebaseService; // Firebase service to interact with the database

    @Autowired
    private UserService userService; // Service for handling user-related operations

    /**
     * Retrieves a list of friends for a given user with their statuses (e.g., active, pending).
     *
     * @param uid The user ID to retrieve friends for.
     * @return A CompletableFuture that resolves to a list of FriendResponseDTO objects.
     */
    public CompletableFuture<List<FriendResponseDTO>> getFriendsOfUser(String uid) {
        String path = "users/" + uid + "/friends";
        System.out.println("[LOG - FriendService] getFriendsOfUser called with uid = " + uid);

        return firebaseService.getWithTypeIndicator(path, new GenericTypeIndicator<Map<String, String>>() {})
                .thenCompose(friendMap -> {
                    if (friendMap == null || friendMap.isEmpty()) {
                        return CompletableFuture.completedFuture(new ArrayList<FriendResponseDTO>());
                    }

                    List<CompletableFuture<Optional<User>>> futureUsers = new ArrayList<>();
                    Map<String, String> finalMap = friendMap;

                    // Fetch user details for each friend asynchronously
                    for (String friendId : finalMap.keySet()) {
                        futureUsers.add(
                                firebaseService.get("users/" + friendId, User.class).thenApply(Optional::ofNullable)
                        );
                    }

                    // Wait for all futures to complete and map them to FriendResponseDTO
                    return CompletableFuture.allOf(futureUsers.toArray(new CompletableFuture[0]))
                            .thenApply(v -> {
                                List<FriendResponseDTO> result = new ArrayList<>();
                                int i = 0;
                                for (String friendId : finalMap.keySet()) {
                                    String status = finalMap.get(friendId);
                                    Optional<User> maybeUser = futureUsers.get(i++).join();
                                    maybeUser.ifPresent(user -> result.add(new FriendResponseDTO(friendId, user, status)));
                                }
                                return result;
                            });
                })
                .exceptionally(ex -> {
                    // Handle errors during the process
                    System.err.println("[LOG - FriendService] Error reading friends from Firebase:");
                    ex.printStackTrace();
                    return new ArrayList<FriendResponseDTO>(); // Return empty list on error
                });
    }

    /**
     * Sends a friend request from one user to another by setting the status to "pending".
     *
     * @param fromUid The user sending the request.
     * @param toUid The user receiving the request.
     * @return A CompletableFuture that resolves when the request has been sent.
     */
    public CompletableFuture<Void> sendFriendRequest(String fromUid, String toUid) {
        String requestPath = USERS_PATH + "/" + toUid + "/friendRequests/" + fromUid;
        return firebaseService.set(requestPath, "pending");
    }

    /**
     * Accepts a friend request from one user to another and updates the friendship status to "active".
     *
     * @param fromUid The user who sent the request.
     * @param toUid The user accepting the request.
     * @return A CompletableFuture that resolves when the request is accepted and the database is updated.
     */
    public CompletableFuture<Void> acceptFriendRequest(String fromUid, String toUid) {
        Map<String, Object> updates = new HashMap<>();
        // Update both users' friend status
        updates.put("users/" + fromUid + "/friends/" + toUid, "active");
        updates.put("users/" + toUid + "/friends/" + fromUid, "active");
        // Remove the pending friend request
        updates.put("users/" + toUid + "/friendRequests/" + fromUid, null);

        return firebaseService.updateMulti(updates);
    }

    /**
     * Rejects a friend request from one user to another by removing the request from the database.
     *
     * @param fromUid The user who sent the request.
     * @param toUid The user rejecting the request.
     * @return A CompletableFuture that resolves when the request is rejected and removed.
     */
    public CompletableFuture<Void> rejectFriendRequest(String fromUid, String toUid) {
        String path = "users/" + toUid + "/friendRequests/" + fromUid;
        return firebaseService.delete(path);
    }

    /**
     * Retrieves a list of friend requests for a given user (requests they have received).
     *
     * @param uid The user ID to retrieve friend requests for.
     * @return A CompletableFuture that resolves to a list of FriendResponseDTO objects representing pending requests.
     */
    public CompletableFuture<List<FriendResponseDTO>> getFriendRequestsForUser(String uid) {
        String requestsPath = "users/" + uid + "/friendRequests";

        return firebaseService.getWithTypeIndicator(requestsPath, new GenericTypeIndicator<Map<String, String>>() {})
                .thenCompose(requestMap -> {
                    if (requestMap == null || requestMap.isEmpty()) {
                        return CompletableFuture.completedFuture(Collections.emptyList());
                    }

                    List<CompletableFuture<Optional<User>>> userFutures = new ArrayList<>();
                    Map<String, String> finalMap = requestMap;

                    // Fetch user details for each sender of the friend requests asynchronously
                    for (String fromUid : finalMap.keySet()) {
                        CompletableFuture<Optional<User>> userFuture =
                                firebaseService.get("users/" + fromUid, User.class)
                                        .thenApply(Optional::ofNullable);
                        userFutures.add(userFuture);
                    }

                    // Wait for all futures to complete and map them to FriendResponseDTO for pending requests
                    return CompletableFuture.allOf(userFutures.toArray(new CompletableFuture[0]))
                            .thenApply(v -> {
                                List<FriendResponseDTO> pendingRequests = new ArrayList<>();
                                int i = 0;
                                for (String fromUid : finalMap.keySet()) {
                                    Optional<User> maybeUser = userFutures.get(i++).join();
                                    if (maybeUser.isPresent()) {
                                        pendingRequests.add(new FriendResponseDTO(fromUid, maybeUser.get(), "pending"));
                                    }
                                }
                                return pendingRequests;
                            });
                });
    }
}
