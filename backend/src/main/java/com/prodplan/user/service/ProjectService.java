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
        User teamLead = userRepository.findById(teamLeadId)
                .orElseThrow(() -> new IllegalArgumentException("Team Lead not found"));

        if (teamLead.getRole() != Role.TEAM_LEAD) {
            throw new IllegalArgumentException("User is not a Team Lead");
        }

        Project project = new Project(name, description, teamLead);
        return projectRepository.save(project);
    }

    public List<Project> getAllProjects() {
        return projectRepository.findAll();
    }

    public List<Project> getProjectsByTeamLead(Long teamLeadId) {
        User teamLead = userRepository.findById(teamLeadId)
                .orElseThrow(() -> new IllegalArgumentException("Team Lead not found"));
        return projectRepository.findByTeamLead(teamLead);
    }
}
