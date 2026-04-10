package com.prodplan.user.service;

import com.prodplan.user.model.DailyOutput;
import com.prodplan.user.model.Project;
import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.DailyOutputRepository;
import com.prodplan.user.repository.ProjectRepository;
import com.prodplan.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;

@Service
public class DailyOutputService {

    private final DailyOutputRepository dailyOutputRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public DailyOutputService(DailyOutputRepository dailyOutputRepository, 
                               ProjectRepository projectRepository, 
                               UserRepository userRepository) {
        this.dailyOutputRepository = dailyOutputRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    public DailyOutput submitOutput(Long operatorId, Long projectId, Integer amount, LocalDate date) {
        User operator = userRepository.findById(operatorId)
                .orElseThrow(() -> new IllegalArgumentException("Operator not found"));
        
        if (operator.getRole() != Role.OPERATOR) {
            throw new IllegalArgumentException("User is not an Operator");
        }

        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));

        DailyOutput output = new DailyOutput(amount, date, operator, project);
        return dailyOutputRepository.save(output);
    }

    public List<DailyOutput> getOutputsByProject(Long projectId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found"));
        return dailyOutputRepository.findByProject(project);
    }
}
