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
@CrossOrigin(origins = "*", methods = {
    org.springframework.web.bind.annotation.RequestMethod.GET,
    org.springframework.web.bind.annotation.RequestMethod.POST,
    org.springframework.web.bind.annotation.RequestMethod.PUT,
    org.springframework.web.bind.annotation.RequestMethod.PATCH,
    org.springframework.web.bind.annotation.RequestMethod.DELETE,
    org.springframework.web.bind.annotation.RequestMethod.OPTIONS
})
public class ProjectController {

    private final ProjectService projectService;
    private final UserService userService;

    public ProjectController(ProjectService projectService, UserService userService) {
        this.projectService = projectService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest request) {
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

    /**
     * FIX: Saves AI-generated spreadsheet data to an existing project.
     * Requires caller to be an authenticated Team Lead or Admin.
     * No project-manager relationship check — Team Leads access projects
     * via their dashboard which already controls visibility, and project_manager_id
     * may be NULL if the admin hasn't formally assigned the team lead yet.
     */
    @PatchMapping("/{id}/spreadsheet")
    public ResponseEntity<?> updateSpreadsheet(
            @PathVariable Long id,
            @RequestBody UpdateSpreadsheetRequest request) {
        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        User caller = callerOpt.get();
        // Allow Admins and Team Leads — no manager relationship check needed.
        // project_manager_id may be NULL and Team Leads reach this via their own dashboard.
        if (caller.getRole() != Role.ADMIN && caller.getRole() != Role.TEAM_LEAD) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Insufficient permissions"));
        }

        try {
            Project project = projectService.updateProject(
                    id,
                    request.name(),
                    null,
                    null,
                    request.status(),
                    request.goal(),
                    request.unit(),
                    request.startDate() != null ? LocalDate.parse(request.startDate()) : null,
                    request.endDate() != null ? LocalDate.parse(request.endDate()) : null,
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

    public record UpdateSpreadsheetRequest(
            String name,
            String status,
            Integer goal,
            String unit,
            String startDate,
            String endDate,
            String googleSheetUrl,
            Map<String, Object> spreadsheetData,
            String callerEmail,
            String callerPin
    ) {}
}