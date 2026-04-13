package com.prodplan.user.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Entity
@Table(name = "projects")
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;
    private String description;
    private String status;
    private Integer goal;
    private String unit;
    @Column(name = "start_date")
    private LocalDate startDate;
    @Column(name = "end_date")
    private LocalDate endDate;
    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
    @Column(name = "google_sheet_url", length = 1024)
    private String googleSheetUrl;
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spreadsheet_data", columnDefinition = "json")
    private Map<String, Object> spreadsheetData;

    @ManyToOne
    @JoinColumn(name = "project_manager_id")
    private User teamLead;

    @ManyToMany
    @JoinTable(
        name = "project_operators",
        joinColumns = @JoinColumn(name = "project_id"),
        inverseJoinColumns = @JoinColumn(name = "operator_id")
    )
    private Set<User> operators = new HashSet<>();

    public Project() {}

    public Project(String name, String description, User teamLead) {
        this.name = name;
        this.description = description;
        this.teamLead = teamLead;
    }

    @PrePersist
    public void prePersist() {
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();
        if (status == null || status.isBlank()) status = "active";
        if (goal == null) goal = 0;
        if (unit == null) unit = "";
        if (startDate == null) startDate = today;
        if (endDate == null) endDate = today;
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
        if (spreadsheetData == null) spreadsheetData = defaultSpreadsheetData();
    }

    @PreUpdate
    public void preUpdate() {
        if (status == null || status.isBlank()) status = "active";
        if (goal == null) goal = 0;
        if (unit == null) unit = "";
        if (startDate == null) startDate = LocalDate.now();
        if (endDate == null) endDate = startDate;
        if (spreadsheetData == null) spreadsheetData = defaultSpreadsheetData();
        updatedAt = LocalDateTime.now();
    }

    public static Map<String, Object> defaultSpreadsheetData() {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("columns", List.of());
        data.put("rows", List.of());
        data.put("merges", List.of());
        return data;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public Integer getGoal() { return goal; }
    public void setGoal(Integer goal) { this.goal = goal; }

    public String getUnit() { return unit; }
    public void setUnit(String unit) { this.unit = unit; }

    public LocalDate getStartDate() { return startDate; }
    public void setStartDate(LocalDate startDate) { this.startDate = startDate; }

    public LocalDate getEndDate() { return endDate; }
    public void setEndDate(LocalDate endDate) { this.endDate = endDate; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public String getGoogleSheetUrl() { return googleSheetUrl; }
    public void setGoogleSheetUrl(String googleSheetUrl) { this.googleSheetUrl = googleSheetUrl; }

    public Map<String, Object> getSpreadsheetData() { return spreadsheetData; }
    public void setSpreadsheetData(Map<String, Object> spreadsheetData) { this.spreadsheetData = spreadsheetData; }

    public User getTeamLead() { return teamLead; }
    public void setTeamLead(User teamLead) { this.teamLead = teamLead; }

    public Set<User> getOperators() { return operators; }
    public void setOperators(Set<User> operators) { this.operators = operators; }
}
