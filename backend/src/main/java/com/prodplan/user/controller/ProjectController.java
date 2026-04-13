package com.prodplan.user.controller;

import com.prodplan.user.dto.ProjectResponse;
import com.prodplan.user.model.Project;
import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.service.ProjectService;
import com.prodplan.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
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
        // Authenticate the caller (Admin)
        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty() || callerOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can create projects"));
        }

        try {
            Project project = projectService.createProject(
                    request.name(),
                    request.description(),
                    request.teamLeadId(),
                    request.status(),
                    request.goal(),
                    request.unit(),
                    request.startDate(),
                    request.endDate(),
                    request.googleSheetUrl(),
                    request.spreadsheetData()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(ProjectResponse.from(project));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getProject(@PathVariable Long id) {
        return projectService.getProjectById(id)
                .map(project -> ResponseEntity.ok(ProjectResponse.from(project)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping
    public ResponseEntity<?> getProjects(
            @RequestParam(required = false) Long teamLeadId,
            @RequestParam(required = false) Long operatorId) {
        if (teamLeadId != null) {
            return ResponseEntity.ok(toResponse(projectService.getProjectsByTeamLead(teamLeadId)));
        }
        if (operatorId != null) {
            return ResponseEntity.ok(toResponse(projectService.getProjectsByOperator(operatorId)));
        }
        return ResponseEntity.ok(toResponse(projectService.getAllProjects()));
    }

    @PostMapping("/{projectId}/operators/{operatorId}")
    public ResponseEntity<?> assignOperator(
            @PathVariable Long projectId,
            @PathVariable Long operatorId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {
        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // Team Lead can assign operators if they are assigned to the project
        if (!isAuthorized && caller.getRole() == Role.TEAM_LEAD) {
            if (projectService.isManagerOfProject(caller.getId(), projectId)) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }

        try {
            Project project = projectService.assignOperator(projectId, operatorId);
            return ResponseEntity.ok(ProjectResponse.from(project));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}/operators/{operatorId}")
    public ResponseEntity<?> removeOperator(
            @PathVariable Long projectId,
            @PathVariable Long operatorId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {
        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        boolean isAuthorized = caller.getRole() == Role.ADMIN;

        // Team Lead can remove operators if they are assigned to the project
        if (!isAuthorized && caller.getRole() == Role.TEAM_LEAD) {
            if (projectService.isManagerOfProject(caller.getId(), projectId)) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }

        try {
            Project project = projectService.removeOperator(projectId, operatorId);
            return ResponseEntity.ok(ProjectResponse.from(project));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteProject(
            @PathVariable Long id,
            @RequestParam String adminEmail,
            @RequestParam String adminPin) {
        Optional<User> callerOpt = userService.authenticate(adminEmail, adminPin);
        if (callerOpt.isEmpty() || callerOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can delete projects"));
        }

        try {
            projectService.deleteProject(id);
            return ResponseEntity.ok(Map.of("message", "Project deleted successfully"));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @PatchMapping("/{id}")
    public ResponseEntity<?> updateProject(
            @PathVariable Long id,
            @RequestBody UpdateProjectRequest request) {
        // Authenticate caller (Admin)
        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty() || callerOpt.get().getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Admins can update projects"));
        }

        try {
            Project project = projectService.updateProject(
                    id,
                    request.name(),
                    request.description(),
                    request.teamLeadId(),
                    request.status(),
                    request.goal(),
                    request.unit(),
                    request.startDate(),
                    request.endDate(),
                    request.googleSheetUrl(),
                    request.spreadsheetData()
            );
            return ResponseEntity.ok(ProjectResponse.from(project));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    private List<ProjectResponse> toResponse(List<Project> projects) {
        return projects.stream().map(ProjectResponse::from).toList();
    }

    public record CreateProjectRequest(
            String name,
            String description,
            Long teamLeadId,
            String status,
            Integer goal,
            String unit,
            LocalDate startDate,
            LocalDate endDate,
            String googleSheetUrl,
            Map<String, Object> spreadsheetData,
            String callerEmail,
            String callerPin
    ) {}

    public record UpdateProjectRequest(
            String name,
            String description,
            Long teamLeadId,
            String status,
            Integer goal,
            String unit,
            LocalDate startDate,
            LocalDate endDate,
            String googleSheetUrl,
            Map<String, Object> spreadsheetData,
            String callerEmail,
            String callerPin
    ) {}
}
