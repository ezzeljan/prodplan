package com.prodplan.user.controller;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest loginRequest) {
        Optional<User> userOpt = userService.authenticate(loginRequest.email(), loginRequest.pin());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return ResponseEntity.ok(Map.of(
                    "message", "Login successful",
                    "user", Map.of(
                            "id", user.getId(),
                            "name", user.getName(),
                            "email", user.getEmail(),
                            "role", user.getRole()
                    )
            ));
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid email or PIN"));
        }
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        // Authenticate the admin attempting to create the user
        Optional<User> adminOpt = userService.authenticate(request.adminEmail(), request.adminPin());
        if (adminOpt.isEmpty() || adminOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can create users"));
        }

        try {
            Role newRole = Role.valueOf(request.role().toUpperCase());
            if (newRole == Role.ADMIN) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", "Cannot create additional Admins via this endpoint"));
            }

            User createdUser = userService.createUser(request.name(), request.email(), newRole);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "User created successfully",
                    "user", Map.of(
                            "id", createdUser.getId(),
                            "name", createdUser.getName(),
                            "email", createdUser.getEmail(),
                            "role", createdUser.getRole(),
                            "pin", createdUser.getPin() // Return the PIN so admin can see it
                    )
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/users")
    public ResponseEntity<?> listUsers(@RequestParam String adminEmail, @RequestParam String adminPin) {
        Optional<User> adminOpt = userService.authenticate(adminEmail, adminPin);
        if (adminOpt.isEmpty() || adminOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can view users"));
        }
        return ResponseEntity.ok(userService.getAllUsers());
    }

    public record LoginRequest(String email, String pin) {}
    public record CreateUserRequest(String name, String email, String role, String adminEmail, String adminPin) {}
}
