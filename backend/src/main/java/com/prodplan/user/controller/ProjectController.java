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
            Project project = projectService.createProject(request.name(), request.description(), request.teamLeadId());
            return ResponseEntity.status(HttpStatus.CREATED).body(project);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getProjects(@RequestParam(required = false) Long teamLeadId) {
        if (teamLeadId != null) {
            return ResponseEntity.ok(projectService.getProjectsByTeamLead(teamLeadId));
        }
        return ResponseEntity.ok(projectService.getAllProjects());
    }

    public record CreateProjectRequest(String name, String description, Long teamLeadId, String adminEmail, String adminPin) {}
}
