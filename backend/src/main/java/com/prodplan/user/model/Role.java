package com.prodplan.user.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.annotation.JsonValue;

public enum Role {
    @JsonProperty("admin")
    ADMIN("admin"),
    
    @JsonProperty("manager")
    PROJECT_MANAGER("manager"),
    
    @JsonProperty("teamlead")
    TEAM_LEAD("teamlead"),
    
    @JsonProperty("operator")
    OPERATOR("operator");

    private final String value;

    Role(String value) {
        this.value = value;
    }

    @JsonValue
    public String getValue() {
        return value;
    }
}
