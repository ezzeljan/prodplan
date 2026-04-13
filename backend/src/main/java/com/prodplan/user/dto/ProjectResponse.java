package com.prodplan.user.dto;

import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;

import java.util.List;
import java.util.Map;

public record ProjectResponse(
        String id,
        String name,
        String overview,
        int goal,
        String unit,
        String startDate,
        String endDate,
        UserSummary projectManager,
        List<UserSummary> operators,
        List<String> resources,
        String createdAt,
        String updatedAt,
        Map<String, Object> spreadsheetData,
        String googleSheetUrl,
        String status,
        List<Object> outputs
) {
    public static ProjectResponse from(Project project) {
        List<UserSummary> operatorSummaries = project.getOperators().stream()
                .map(UserSummary::from)
                .toList();

        return new ProjectResponse(
                String.valueOf(project.getId()),
                project.getName(),
                project.getDescription(),
                project.getGoal() == null ? 0 : project.getGoal(),
                project.getUnit() == null ? "" : project.getUnit(),
                project.getStartDate() == null ? null : project.getStartDate().toString(),
                project.getEndDate() == null ? null : project.getEndDate().toString(),
                UserSummary.from(project.getTeamLead()),
                operatorSummaries,
                operatorSummaries.stream().map(UserSummary::name).toList(),
                project.getCreatedAt() == null ? null : project.getCreatedAt().toString(),
                project.getUpdatedAt() == null ? null : project.getUpdatedAt().toString(),
                project.getSpreadsheetData() == null ? Project.defaultSpreadsheetData() : project.getSpreadsheetData(),
                project.getGoogleSheetUrl(),
                project.getStatus() == null || project.getStatus().isBlank() ? "active" : project.getStatus(),
                List.of()
        );
    }

    public record UserSummary(
            String id,
            String name,
            String email,
            String role
    ) {
        public static UserSummary from(User user) {
            if (user == null) return null;
            return new UserSummary(
                    String.valueOf(user.getId()),
                    user.getName(),
                    user.getEmail(),
                    user.getRole() == null ? null : user.getRole().name()
            );
        }
    }
}
