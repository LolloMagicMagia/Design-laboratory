package com.example.bicoChat_backend.controller.google;

import com.example.bicoChat_backend.service.google.GoogleAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
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
    public ResponseEntity<Map<String, Object>> authenticateWithGoogle(@RequestBody Map<String, String> request) {
        try {
            String idToken = request.get("idToken");
            //print
            if (idToken == null || idToken.isEmpty()) {
                //print
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("error", "Token Google not provided"));
            }

            Map<String, Object> userData = googleAuthService.verifyGoogleToken(idToken);
            return ResponseEntity.ok().body(userData);

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(500)
                    .body(Map.of("error", "Authentication failed", "details", e.getMessage()));
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
