package com.example.bicoChat_backend.controller.google;

import com.example.bicoChat_backend.service.google.GoogleAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
//@CrossOrigin(origins = "*")
public class GoogleAuthController {

    private final GoogleAuthService googleAuthService;

    @Autowired
    public GoogleAuthController(GoogleAuthService googleAuthService) {
        this.googleAuthService = googleAuthService;
    }

    /**
     * Endpoint for user auth using Google.
     * @param request Contains the token ID from Google.
     * @return Authenticated User data or auth error
     */
    @PostMapping("/google")
    public ResponseEntity<?> authenticateWithGoogle(@RequestBody Map<String, String> request) {
        String idToken = request.get("idToken");

        if (idToken == null || idToken.isEmpty()) {
            return ResponseEntity.badRequest().body("Token Google not provided");
        }

        try {
            // Verify the Google token e obtain user data
            Map<String, Object> userData = googleAuthService.verifyGoogleToken(idToken);
            return ResponseEntity.ok(userData);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body("Authentication failed: " + e.getMessage());
        }
    }

    /**
     * Endpoint for test Google Services.
     * @return Service state.
     */
    @GetMapping("/googletest")
    public ResponseEntity<String> testAuth() {
        return ResponseEntity.ok(googleAuthService.testService());
    }

    /**
     * Endpoint for obtaining user's info given the UID.
     * @param uid User's UID.
     * @return User's information.
     */
    @GetMapping("/user/{uid}")
    public ResponseEntity<String> getUserInfo(@PathVariable String uid) {
        return ResponseEntity.ok(googleAuthService.getUserInfo(uid));
    }
}
