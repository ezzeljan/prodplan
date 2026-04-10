package com.prodplan.user.model;

import jakarta.persistence.*;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;

    @ManyToOne
    @JoinColumn(name = "team_lead_id")
    private User teamLead;

    public Project() {}

    public Project(String name, String description, User teamLead) {
        this.name = name;
        this.description = description;
        this.teamLead = teamLead;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public User getTeamLead() { return teamLead; }
    public void setTeamLead(User teamLead) { this.teamLead = teamLead; }
}
