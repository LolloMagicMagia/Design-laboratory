package com.example.bicoChat_backend.controller.firebase;

import com.example.bicoChat_backend.service.firebase.FirebaseService;
import com.google.firebase.auth.FirebaseAuthException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class FirebaseController {

    private final FirebaseService firebaseService;

    public FirebaseController(FirebaseService firebaseService) {
        this.firebaseService = firebaseService;
    }

    @GetMapping("/users")
    public String getUsers() {
        try {
            firebaseService.listAllUsers();
            return "Check console for users!";
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }

    }

    @PostMapping("/createUser")
    public String createUser(@RequestParam String email, @RequestParam String password) {
        try {
            return firebaseService.creteUnverifiedUser(email, password);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    @PostMapping("/verifyUser")
    public String verifyUser(@RequestParam String email) {
        try {
            return firebaseService.verifyUser(email);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }
}