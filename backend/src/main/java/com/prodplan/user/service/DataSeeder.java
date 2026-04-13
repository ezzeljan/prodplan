package com.prodplan.user.service;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;
import java.util.Optional;

@Component
public class DataSeeder {

    private final UserService userService;
    private final UserRepository userRepository;

    public DataSeeder(UserService userService, UserRepository userRepository) {
        this.userService = userService;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void seedAdmin() {
        String adminEmail = "lifewood@ph.com";
        String targetPin = "lifewood@";

        // 1. Resolve PIN collisions: If another user already has '123456', change their PIN first
        userRepository.findByPin(targetPin).ifPresent(otherUser -> {
            if (!otherUser.getEmail().equals(adminEmail)) {
                otherUser.setPin("000000"); // Temporarily move the PIN
                userRepository.save(otherUser);
            }
        });

        // 2. Seed or Update the new Admin
        java.util.Optional<com.prodplan.user.model.User> existing = userRepository.findByEmailAndRole(adminEmail, Role.ADMIN);
        
        if (existing.isEmpty()) {
            com.prodplan.user.model.User admin = new com.prodplan.user.model.User("System Admin", adminEmail, Role.ADMIN, targetPin);
            userRepository.save(admin);
            System.out.println("Seeded Admin user. Email: " + adminEmail + ", PIN: " + targetPin);
        } else {
            com.prodplan.user.model.User admin = existing.get();
            // Ensure role is Admin, but don't reset PIN if it already exists
            admin.setRole(Role.ADMIN);
            userRepository.save(admin);
            System.out.println("Verified existing Admin account. Email: " + adminEmail);
        }
    }
}
