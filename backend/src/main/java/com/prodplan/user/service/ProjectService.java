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

    public Project createProject(String name, String description, Long projectManagerId) {
        User projectManager = userRepository.findById(projectManagerId)
                .orElseThrow(() -> new IllegalArgumentException("Project Manager not found"));

        if (projectManager.getRole() != Role.PROJECT_MANAGER) {
            throw new IllegalArgumentException("User is not a Project Manager");
        }

        Project project = new Project(name, description, projectManager);
        return projectRepository.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getProjectsByProjectManager(Long projectManagerId) {
        User pm = userRepository.findById(projectManagerId)
                .orElseThrow(() -> new IllegalArgumentException("Project Manager not found"));
        return projectRepository.findByProjectManager(pm);
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
        return projectRepository.save(project);
    }

    public Project removeOperator(Long projectId, Long operatorId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        User operator = userRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));

        project.getOperators().remove(operator);
        return projectRepository.save(project);
    }

    public Project getOrCreateProject(String name) {
        if (name == null || name.isBlank()) return null;
        return projectRepository.findByName(name.trim())
                .orElseGet(() -> {
                    Project newProject = new Project(name.trim(), "Auto-generated during personnel registration", null);
                    return projectRepository.save(newProject);
                });
    }

    public boolean isManagerOfProject(Long userId, Long projectId) {
        if (userId == null || projectId == null) return false;
        return projectRepository.findById(projectId)
                .map(p -> p.getProjectManager() != null && p.getProjectManager().getId().equals(userId))
                .orElse(false);
    }

    public Project updateProject(Long id, String name, String description, Long projectManagerId) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        if (name != null) project.setName(name);
        if (description != null) project.setDescription(description);
        if (projectManagerId != null) {
            User projectManager = userRepository.findById(projectManagerId)
                    .orElseThrow(() -> new IllegalArgumentException("Project Manager not found"));
            if (projectManager.getRole() != Role.PROJECT_MANAGER) {
                throw new IllegalArgumentException("User is not a Project Manager");
            }
            project.setProjectManager(projectManager);
        }

        return projectRepository.save(project);
    }
}
