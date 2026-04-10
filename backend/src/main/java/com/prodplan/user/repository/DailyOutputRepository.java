package com.prodplan.user.repository;

import com.prodplan.user.model.DailyOutput;
import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface DailyOutputRepository extends JpaRepository<DailyOutput, Long> {
    List<DailyOutput> findByProject(Project project);
    List<DailyOutput> findByOperator(User operator);
    List<DailyOutput> findByProjectAndDate(Project project, LocalDate date);
}
