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
        // Authenticate the caller (Admin or PM) attempting to create the user
        Optional<User> callerOpt = userService.authenticate(request.adminEmail(), request.adminPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        // Authorization checks
        boolean isAuthorized = false;
        if (caller.getRole() == Role.ADMIN) {
            // Admin can ONLY create Project Managers
            if (request.role() == Role.PROJECT_MANAGER) {
                isAuthorized = true;
            }
        } else if (caller.getRole() == Role.PROJECT_MANAGER) {
            // Project Managers can ONLY create Operators
            if (request.role() == Role.OPERATOR) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            String errorMsg = caller.getRole() == Role.ADMIN ? 
                "Admins can only create Project Managers. Operators must be created by Project Managers." :
                "Insufficient permissions or invalid role creation.";
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", errorMsg));
        }

    try {
        User createdUser = userService.createUser(request.name(), request.email(), request.role(), request.manualPin());
        
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
                if (createdUser.getRole() == Role.PROJECT_MANAGER) {
                    projectService.updateProject(targetProject.getId(), null, null, createdUser.getId());
                } else if (createdUser.getRole() == Role.OPERATOR) {
                    projectService.assignOperator(targetProject.getId(), createdUser.getId());
                }
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
            @RequestParam String adminEmail,
            @RequestParam String adminPin) {
        Optional<User> callerOpt = userService.authenticate(adminEmail, adminPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // If PM, they can only delete Operators
        if (!isAuthorized && caller.getRole() == Role.PROJECT_MANAGER) {
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
        // Authenticate the caller (Admin or PM) attempting to update the user
        Optional<User> callerOpt = userService.authenticate(request.adminEmail(), request.adminPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // If PM, they can only update Operators
        if (!isAuthorized && caller.getRole() == Role.PROJECT_MANAGER) {
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
    public record CreateUserRequest(String name, String email, Role role, String adminEmail, String adminPin, String manualPin, String projectId, String projectTitle) {}
    public record UpdateUserRequest(String name, String email, Role role, String pin, String adminEmail, String adminPin) {}
}
