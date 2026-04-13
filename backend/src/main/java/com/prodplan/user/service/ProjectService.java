package com.prodplan.user.service;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.ProjectRepository;
import com.prodplan.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public Project createProject(String name, String description, Long teamLeadId) {
        System.out.println("[DEBUG] createProject name=" + name + ", teamLeadId=" + teamLeadId);
        User teamLead = userRepository.findById(teamLeadId)
                .orElseThrow(() -> new IllegalArgumentException("Team Lead not found"));

        if (teamLead.getRole() != Role.TEAM_LEAD) {
            throw new IllegalArgumentException("User is not a Team Lead");
        }

        Project project = new Project(name, description, teamLead);
        try {
            return projectRepository.save(project);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error: Likely a duplicate project name.");
        }
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getProjectsByTeamLead(Long teamLeadId) {
        if (teamLeadId == null) return List.of();
        User tl = userRepository.findById(teamLeadId)
                .orElseThrow(() -> new IllegalArgumentException("Team Lead not found"));
        try {
            return projectRepository.findByTeamLead(tl);
        } catch (Exception e) {
            // Graceful fallback if schema hasn't fully updated yet
            return List.of();
        }
    }

    public List<Project> getProjectsByOperator(Long operatorId) {
        User operator = userRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        return projectRepository.findByOperatorsContaining(operator);
    }

    public Project assignOperator(Long projectId, Long operatorId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        User operator = userRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));

        if (operator.getRole() != Role.OPERATOR) {
            throw new IllegalArgumentException("User is not an Operator");
        }

        project.getOperators().add(operator);
        try {
            return projectRepository.save(project);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error during operator assignment.");
        }
    }

    public Project removeOperator(Long projectId, Long operatorId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        User operator = userRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));

        project.getOperators().remove(operator);
        try {
            return projectRepository.save(project);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error during operator removal.");
        }
    }

    public Project getOrCreateProject(String name) {
        if (name == null || name.isBlank()) return null;
        String trimmedName = name.trim();
        System.out.println("[DEBUG] getOrCreateProject trimmedName=" + trimmedName);
        return projectRepository.findByName(trimmedName)
                .orElseGet(() -> {
                    Project newProject = new Project(name.trim(), "Auto-generated during personnel registration", null);
                    try {
                        return projectRepository.save(newProject);
                    } catch (org.springframework.dao.DataIntegrityViolationException e) {
                        return projectRepository.findByName(name.trim()).orElse(null);
                    }
                });
    }

    public boolean isManagerOfProject(Long userId, Long projectId) {
        if (userId == null || projectId == null) return false;
        return projectRepository.findById(projectId)
                .map(p -> p.getTeamLead() != null && p.getTeamLead().getId().equals(userId))
                .orElse(false);
    }

    public Project updateProject(Long id, String name, String description, Long teamLeadId) {
        System.out.println("[DEBUG] updateProject id=" + id + ", teamLeadId=" + teamLeadId);
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (name != null) project.setName(name);
        if (description != null) project.setDescription(description);
        if (teamLeadId != null) {
            User teamLead = userRepository.findById(teamLeadId)
                    .orElseThrow(() -> new IllegalArgumentException("Team Lead not found"));
            if (teamLead.getRole() != Role.TEAM_LEAD) {
                throw new IllegalArgumentException("User is not a Team Lead");
            }
            project.setTeamLead(teamLead);
        } else {
            // If teamLeadId is null, we just leave the current teamLead as is
            // This is useful for name/description updates only
        }

        try {
            return projectRepository.save(project);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error: could not update project. Check for duplicate names.");
        }
    }
}
