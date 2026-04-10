package com.prodplan.user.service;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Component;

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
        String adminEmail = "alexacarpentero9@gmail.com";
        if (userRepository.findByEmail(adminEmail).isEmpty()) {
            User admin = userService.createUser("System Admin", adminEmail, Role.ADMIN);
            System.out.println("Seeded Admin user. Email: " + adminEmail + ", PIN: " + admin.getPin());
        }
    }
}
