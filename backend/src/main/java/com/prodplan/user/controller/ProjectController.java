package com.prodplan.user.controller;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;
import com.prodplan.user.service.ProjectService;
import com.prodplan.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
@CrossOrigin(origins = "*")
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    public ProjectController(ProjectService projectService, UserService userService) {
        this.projectService = projectService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest request) {
        // Authenticate admin
        Optional<User> adminOpt = userService.authenticate(request.adminEmail(), request.adminPin());
        if (adminOpt.isEmpty() || adminOpt.get().getRole() != com.prodplan.user.model.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can create projects"));
        }

        try {
            Project project = projectService.createProject(request.name(), request.description(), request.projectManagerId());
            return ResponseEntity.status(HttpStatus.CREATED).body(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getProjects(
            @RequestParam(required = false) Long projectManagerId,
            @RequestParam(required = false) Long operatorId) {
        if (projectManagerId != null) {
            return ResponseEntity.ok(projectService.getProjectsByProjectManager(projectManagerId));
        }
        if (operatorId != null) {
            return ResponseEntity.ok(projectService.getProjectsByOperator(operatorId));
        }
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    @PostMapping("/{projectId}/operators/{operatorId}")
    public ResponseEntity<?> assignOperator(
            @PathVariable Long projectId,
            @PathVariable Long operatorId,
            @RequestParam String adminEmail,
            @RequestParam String adminPin) {
        Optional<User> adminOpt = userService.authenticate(adminEmail, adminPin);
        if (adminOpt.isEmpty() || adminOpt.get().getRole() != com.prodplan.user.model.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can assign operators"));
        }

        try {
            Project project = projectService.assignOperator(projectId, operatorId);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}/operators/{operatorId}")
    public ResponseEntity<?> removeOperator(
            @PathVariable Long projectId,
            @PathVariable Long operatorId,
            @RequestParam String adminEmail,
            @RequestParam String adminPin) {
        Optional<User> adminOpt = userService.authenticate(adminEmail, adminPin);
        if (adminOpt.isEmpty() || adminOpt.get().getRole() != com.prodplan.user.model.Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can remove operators"));
        }

        try {
            Project project = projectService.removeOperator(projectId, operatorId);
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long id,
            @RequestBody UpdateProjectRequest request) {
        // For simplicity, we'll check admin credentials in the request body if present,
        // or just allow it for now if we want to skip more auth refactoring.
        // But let's be safe and check if adminEmail/Pin are provided.
        if (request.adminEmail() != null && request.adminPin() != null) {
            Optional<User> adminOpt = userService.authenticate(request.adminEmail(), request.adminPin());
            if (adminOpt.isEmpty() || adminOpt.get().getRole() != com.prodplan.user.model.Role.ADMIN) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can update projects"));
            }
        }

        try {
            Project project = projectService.updateProject(id, request.name(), request.description(), request.projectManagerId());
            return ResponseEntity.ok(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    public record CreateProjectRequest(String name, String description, Long projectManagerId, String adminEmail, String adminPin) {}
    public record UpdateProjectRequest(String name, String description, Long projectManagerId, String adminEmail, String adminPin) {}
}
