package com.example.bicoChat_backend.controller.user;

import com.example.bicoChat_backend.dto.request.UserRegisterRequest;
import com.example.bicoChat_backend.service.user.RegistrationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.enums.ParameterIn;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * REST controller for managing user registration, login, and authentication using Firebase.
 * Handles endpoints related to user account creation, verification, login, and logout.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000") // Allow requests from frontend at localhost:3000
public class RegistrationController {

    private final RegistrationService registrationService;

    /**
     * Constructor injection for the registration service.
     *
     * @param firebaseService the service handling Firebase-related user operations
     */
    public RegistrationController(RegistrationService firebaseService) {
        System.out.println("[LOG - RegistrationController] initialized");
        this.registrationService = firebaseService;
    }

    @Operation(
            summary = "List all registered users",
            description = "Logs all user information to the server console.",
            responses = {
                    @ApiResponse(responseCode = "200", description = "Operation successful, check console for users"),
                    @ApiResponse(responseCode = "500", description = "Internal server error")
            }
    )
    @GetMapping("/users")
    public String getUsers() {
        try {
            registrationService.listAllUsers();
            return "Check console for users!";
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    @Operation(
            summary = "Create a new unverified user",
            description = "Creates a new user with email and password. Email will be unverified initially.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "User registration payload containing email and password",
                    required = true
            ),
            responses = {
                    @ApiResponse(responseCode = "200", description = "User created successfully"),
                    @ApiResponse(responseCode = "500", description = "Error creating user")
            }
    )
    @PostMapping("/createUser")
    public ResponseEntity<?> createUser(@RequestBody UserRegisterRequest request) {
        try {
            String result = registrationService.creteUnverifiedUser(request.getEmail(), request.getPassword());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(e.getMessage());
        }
    }

    @Operation(
            summary = "Manually verify a user's email",
            description = "Verifies the email address of a user manually.",
            parameters = {
                    @Parameter(name = "email", description = "Email of the user to verify", required = true, in = ParameterIn.QUERY)
            },
            responses = {
                    @ApiResponse(responseCode = "200", description = "User verified successfully"),
                    @ApiResponse(responseCode = "500", description = "Verification failed")
            }
    )
    @PostMapping("/verifyUser")
    public String verifyUser(@RequestParam String email) {
        try {
            return registrationService.verifyUser(email);
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    @Operation(
            summary = "User login",
            description = "Logs in a user using email and password.",
            requestBody = @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Login payload containing email and password",
                    required = true
            ),
            responses = {
                    @ApiResponse(responseCode = "200", description = "Login successful"),
                    @ApiResponse(responseCode = "401", description = "Unauthorized - invalid credentials"),
                    @ApiResponse(responseCode = "500", description = "Login error")
            }
    )
    @PostMapping("/login")
    public ResponseEntity<Object> login (@RequestBody UserRegisterRequest request) {
        return registrationService.login(request);
    }

    @Operation(
            summary = "User logout",
            description = "Logs out the user identified by the email.",
            parameters = {
                    @Parameter(name = "email", description = "Email of the user to log out", required = true, in = ParameterIn.QUERY)
            },
            responses = {
                    @ApiResponse(responseCode = "200", description = "Logout successful"),
                    @ApiResponse(responseCode = "500", description = "Logout failed")
            }
    )
    @PostMapping("/logout")
    public ResponseEntity<String> logout(@RequestParam String email) {
        return registrationService.logout(email);
    }

}
