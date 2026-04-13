package com.prodplan.user.repository;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectRepository extends JpaRepository<Project, Long> {
    List<Project> findByTeamLead(User teamLead);
    List<Project> findByOperatorsContaining(User operator);
    java.util.Optional<Project> findByName(String name);
}
