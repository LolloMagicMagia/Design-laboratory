package com.example.bicoChat_backend.controller.firebase;

import com.example.bicoChat_backend.model.UserRegisterRequest;
import com.example.bicoChat_backend.service.firebase.FirebaseService;
import com.google.firebase.auth.FirebaseAuthException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
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
    public ResponseEntity<?> createUser(@RequestBody UserRegisterRequest request) {
        try {
            String result = firebaseService.creteUnverifiedUser(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
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