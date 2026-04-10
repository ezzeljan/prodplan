package com.prodplan.user.model;

import jakarta.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "daily_outputs")
public class DailyOutput {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer amount;
    private LocalDate date;

    @ManyToOne
    @JoinColumn(name = "operator_id")
    private User operator;

    @ManyToOne
    @JoinColumn(name = "project_id")
    private Project project;

    public DailyOutput() {}

    public DailyOutput(Integer amount, LocalDate date, User operator, Project project) {
        this.amount = amount;
        this.date = date;
        this.operator = operator;
        this.project = project;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Integer getAmount() { return amount; }
    public void setAmount(Integer amount) { this.amount = amount; }

    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }

    public User getOperator() { return operator; }
    public void setOperator(User operator) { this.operator = operator; }

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
}
