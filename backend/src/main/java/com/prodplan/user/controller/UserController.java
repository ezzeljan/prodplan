package com.prodplan.user.controller;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.service.ProjectService;
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
    private final ProjectService projectService;

    public UserController(UserService userService, ProjectService projectService) {
        this.userService = userService;
        this.projectService = projectService;
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

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        return userService.getUserById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody CreateUserRequest request) {
        System.out.println("[DEBUG] createUser request=" + request);
        // Authenticate the caller (Admin or Team Lead) attempting to create the user
        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        // Authorization checks
        boolean isAuthorized = false;
        if (caller.getRole() == Role.ADMIN) {
            // Admin can ONLY create Team Leads
            if (request.role() == Role.TEAM_LEAD) {
                isAuthorized = true;
            }
        } else if (caller.getRole() == Role.TEAM_LEAD) {
            // Team Leads can ONLY create Operators
            if (request.role() == Role.OPERATOR) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            String errorMsg = caller.getRole() == Role.ADMIN ? 
                "Admins can only create Team Leads. Operators must be created by Team Leads." :
                "Insufficient permissions or invalid role creation.";
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", errorMsg));
        }

    try {
        System.out.println("[DEBUG] Creating user in service...");
        User createdUser = userService.createUser(request.name(), request.email(), request.role(), request.manualPin());
        System.out.println("[DEBUG] User created: " + createdUser.getId());
        
        // Integrated/Dynamic Project Assignment
        Project targetProject = null;
        if (request.projectTitle() != null && !request.projectTitle().isBlank()) {
            targetProject = projectService.getOrCreateProject(request.projectTitle());
        } else if (request.projectId() != null && !request.projectId().isBlank()) {
            // Safely parse the projectId string to Long
            try {
                Long pId = Long.parseLong(request.projectId());
                targetProject = projectService.getAllProjects().stream()
                        .filter(p -> p.getId().equals(pId))
                        .findFirst().orElse(null);
            } catch (NumberFormatException e) {
                // If not a valid Long, ignore it
            }
        }

            if (targetProject != null) {
                System.out.println("[DEBUG] Assigning user to project: " + targetProject.getName());
                try {
                    if (createdUser.getRole() == Role.TEAM_LEAD) {
                        projectService.updateProject(
                                targetProject.getId(),
                                null,
                                null,
                                createdUser.getId(),
                                null,
                                null,
                                null,
                                null,
                                null,
                                null,
                                null
                        );
                    } else if (createdUser.getRole() == Role.OPERATOR) {
                        projectService.assignOperator(targetProject.getId(), createdUser.getId());
                    }
                } catch (Exception e) {
                    // Log error and continue - user creation was successful
                    System.err.println("[ERROR] Failed to assign project: " + e.getMessage());
                }
            } else {
                System.out.println("[DEBUG] No target project for assignment.");
            }
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

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(
            @PathVariable Long id,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {
        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // If Team Lead, they can only delete Operators
        if (!isAuthorized && caller.getRole() == Role.TEAM_LEAD) {
            Optional<User> targetOpt = userService.getUserById(id);
            if (targetOpt.isPresent() && targetOpt.get().getRole() == Role.OPERATOR) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }

        try {
            userService.deleteUser(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<?> updateUser(
            @PathVariable Long id,
            @RequestBody UpdateUserRequest request) {
        // Authenticate the caller (Admin or Team Lead) attempting to update the user
        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // If Team Lead, they can only update Operators
        if (!isAuthorized && caller.getRole() == Role.TEAM_LEAD) {
            Optional<User> targetOpt = userService.getUserById(id);
            if (targetOpt.isPresent() && targetOpt.get().getRole() == Role.OPERATOR) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }

        try {
            User updatedUser = userService.updateUser(id, request.name(), request.email(), request.role(), request.pin());
            return ResponseEntity.ok(Map.of(
                    "message", "User updated successfully",
                    "user", updatedUser
            ));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    public record LoginRequest(String email, String pin) {}
    public record CreateUserRequest(String name, String email, Role role, String callerEmail, String callerPin, String manualPin, String projectId, String projectTitle) {}
    public record UpdateUserRequest(String name, String email, Role role, String pin, String callerEmail, String callerPin) {}
}
