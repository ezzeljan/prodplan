package com.prodplan.user.model;

import jakarta.persistence.*;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @Column(nullable = false)
    private String email;

    @Convert(converter = RoleConverter.class)
    @Column(nullable = false)
    private Role role;

    @jakarta.persistence.Converter(autoApply = true)
    public static class RoleConverter implements AttributeConverter<Role, String> {
        @Override
        public String convertToDatabaseColumn(Role role) {
            return role == null ? null : role.name();
        }

        @Override
        public Role convertToEntityAttribute(String dbData) {
            if (dbData == null) return null;
            try {
                return Role.valueOf(dbData.toUpperCase());
            } catch (IllegalArgumentException e) {
                // Fallback for names like 'PROJECT_MANAGER' - we can handle this if needed
                if ("PROJECT_MANAGER".equalsIgnoreCase(dbData)) return Role.TEAM_LEAD;
                return Role.fromString(dbData);
            }
        }
    }

    @Column(unique = true, nullable = false)
    private String pin;

    // Default constructor for JPA
    public User() {}

    public User(String name, String email, Role role, String pin) {
        this.name = name;
        this.email = email;
        this.role = role;
        this.pin = pin;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    
    public Role getRole() { return role; }
    public void setRole(Role role) { this.role = role; }
    
    public String getPin() { return pin; }
    public void setPin(String pin) { this.pin = pin; }
}
