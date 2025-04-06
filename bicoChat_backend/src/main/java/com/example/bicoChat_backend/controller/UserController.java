package com.example.bicoChat_backend.controller;

import com.example.bicoChat_backend.service.FirebaseService;
import com.example.bicoChat_backend.service.UserService;
import com.google.firebase.database.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import javax.annotation.PostConstruct;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @PostConstruct
    public void initFirebaseUserListener() {
        firebaseService.listenToUsersChanges(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                userService.getAllUsers().thenAccept(users -> {
                    messagingTemplate.convertAndSend("/topic/users", users);
                });
            }

            @Override
            public void onCancelled(DatabaseError error) {
                System.err.println("Error on /users: " + error.getMessage());
            }
        });
    }

    @GetMapping
    public Object getAllUsers() throws ExecutionException, InterruptedException {
        return userService.getAllUsers().get();
    }

    @GetMapping("/{uid}")
    public Object getUserById(@PathVariable String uid) throws ExecutionException, InterruptedException {
        return userService.getUserById(uid).get();
    }

    @PutMapping("/{uid}/status")
    public void updateUserStatus(@PathVariable String uid, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        userService.updateUserStatus(uid, status);
    }
}
