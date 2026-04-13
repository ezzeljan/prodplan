package com.prodplan.user.model;

import jakarta.persistence.*;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @ManyToOne
    @JoinColumn(name = "project_manager_id")
    private User projectManager;

    @ManyToMany
    @JoinTable(
        name = "project_operators",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "operator_id")
    )
    private Set<User> operators = new HashSet<>();

    public Project() {}

    public Project(String name, String description, User projectManager) {
        this.name = name;
        this.description = description;
        this.projectManager = projectManager;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getProjectManager() { return projectManager; }
    public void setProjectManager(User projectManager) { this.projectManager = projectManager; }

    public Set<User> getOperators() { return operators; }
    public void setOperators(Set<User> operators) { this.operators = operators; }
}
