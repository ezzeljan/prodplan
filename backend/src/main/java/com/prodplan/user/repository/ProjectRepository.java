package com.prodplan.user.repository;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByTeamLeadAndStatusNot(User teamLead, String status);
    List<Project> findByOperatorsContainingAndStatusNot(User operator, String status);
    List<Project> findByStatusNot(String status);
    java.util.Optional<Project> findByName(String name);
}
