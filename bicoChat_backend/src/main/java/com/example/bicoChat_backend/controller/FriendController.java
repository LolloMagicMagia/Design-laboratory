package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.dto.request.FriendRequestDTO;
import com.example.bicoChat_backend.dto.response.FriendResponseDTO;
import com.example.bicoChat_backend.service.FriendService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.CompletableFuture;

/**
 * Controller for handling friendship-related API requests.
 * This includes retrieving friends, sending/accepting/rejecting friend requests.
 */
@RestController
@RequestMapping("/api/friends")
public class FriendController {

    @Autowired
    private FriendService friendService; // Service for handling friendship logic

    @Operation(
            summary = "Retrieve the friends list of a user",
            description = "Returns a list of friends for the specified user ID.",
            parameters = {
                    @Parameter(name = "uid", description = "Unique identifier of the user", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Successfully retrieved friends list"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/{uid}")
    public CompletableFuture<ResponseEntity<List<FriendResponseDTO>>> getFriends(@PathVariable String uid) {
        return friendService.getFriendsOfUser(uid)
                .thenApply(new java.util.function.Function<List<FriendResponseDTO>, ResponseEntity<List<FriendResponseDTO>>>() {
                    @Override
                    public ResponseEntity<List<FriendResponseDTO>> apply(List<FriendResponseDTO> friends) {
                        return ResponseEntity.ok(friends); // Return the list of friends in a 200 OK response
                    }
                });
    }

    @Operation(
            summary = "Send a friend request",
            description = "Sends a friend request from one user to another.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Friend request payload containing sender and receiver user IDs",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friend request sent successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/request")
    public CompletableFuture<ResponseEntity<String>> sendFriendRequest(@RequestBody FriendRequestDTO request) {
        return friendService.sendFriendRequest(request.getFromUid(), request.getToUid())
                .thenApply(v -> ResponseEntity.ok("Friend request sent")); // Respond with success message
    }

    @Operation(
            summary = "Retrieve pending friend requests",
            description = "Returns a list of pending friend requests for the specified user ID.",
            parameters = {
                    @Parameter(name = "uid", description = "User ID to get pending friend requests for", required = true, in = ParameterIn.PATH)
            }
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Pending friend requests retrieved successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @GetMapping("/requests/{uid}")
    public CompletableFuture<List<FriendResponseDTO>> getFriendRequests(@PathVariable String uid) {
        return friendService.getFriendRequestsForUser(uid); // Call service to get pending requests
    }

    @Operation(
            summary = "Accept a friend request",
            description = "Accepts a friend request sent from one user to another.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Friend request payload containing sender and receiver user IDs",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friend request accepted successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @PostMapping("/accept")
    public CompletableFuture<ResponseEntity<String>> acceptRequest(@RequestBody FriendRequestDTO request) {
        return friendService.acceptFriendRequest(request.getFromUid(), request.getToUid())
                .thenApply(v -> ResponseEntity.ok("Friend request accepted")); // Respond with success message
    }

    @Operation(
            summary = "Reject a friend request",
            description = "Rejects a friend request sent from one user to another.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Friend request payload containing sender and receiver user IDs",
                    required = true
            )
    )
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Friend request rejected successfully"),
            @ApiResponse(responseCode = "500", description = "Internal server error")
    })
    @DeleteMapping("/request")
    public CompletableFuture<ResponseEntity<String>> rejectRequest(@RequestBody FriendRequestDTO request) {
        return friendService.rejectFriendRequest(request.getFromUid(), request.getToUid())
                .thenApply(v -> ResponseEntity.ok("Friend request rejected")); // Respond with success message
    }

    /**
     * Constructor for FriendController that logs the initialization.
     */
    public FriendController() {
        System.out.println("[LOG - FriendController] initialized");
    }
}
