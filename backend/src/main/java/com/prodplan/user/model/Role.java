package com.prodplan.user.model;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    @JsonProperty("ADMIN")
    ADMIN("ADMIN"),
    
    @JsonProperty("TEAM_LEAD")
    TEAM_LEAD("TEAM_LEAD"),
    
    @JsonProperty("OPERATOR")
    OPERATOR("OPERATOR");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }

    @JsonCreator
    public static Role fromString(String role) {
        if (role == null) return null;
        String normalized = role.trim().toLowerCase();
        for (Role r : Role.values()) {
            if (r.value.equals(normalized) || r.name().toLowerCase().replace("_", "").equals(normalized.replace("_", ""))) {
                return r;
            }
        }
        // Fallback for names like 'PROJECT_MANAGER' or 'ADMIN'
        try {
            return Role.valueOf(role.toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
