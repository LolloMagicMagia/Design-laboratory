package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.dto.response.UserResponse;
import com.example.bicoChat_backend.model.User;
import com.example.bicoChat_backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @GetMapping("/{userId}")
    public CompletableFuture<ResponseEntity<UserResponse>> getUserById(@PathVariable String userId) {
        return userService.getUserById(userId)
                .thenApply(optionalUser -> optionalUser
                        .map(ResponseEntity::ok)
                        .orElse(ResponseEntity.notFound().build()));
    }

    @GetMapping
    public CompletableFuture<List<UserResponse>> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/{userId}")
    public CompletableFuture<ResponseEntity<Void>> addUser(@PathVariable String userId, @RequestBody User user) {
        return userService.addUser(userId, user)
                .thenApply(v -> ResponseEntity.ok().build());
    }

    @PatchMapping("/{userId}/status")
    public CompletableFuture<ResponseEntity<Void>> updateUserStatus(
            @PathVariable String userId,
            @RequestBody Map<String, String> statusUpdate) {

        String newStatus = statusUpdate.get("status");
        if (newStatus == null) {
            return CompletableFuture.completedFuture(ResponseEntity.badRequest().build());
        }

        return userService.updateUserStatus(userId, newStatus)
                .thenApply(v -> ResponseEntity.ok().build());
    }

    @DeleteMapping("/{userId}")
    public CompletableFuture<ResponseEntity<Void>> deleteUser(@PathVariable String userId) {
        return userService.deleteUser(userId)
                .thenApply(v -> ResponseEntity.ok().build());
    }
}