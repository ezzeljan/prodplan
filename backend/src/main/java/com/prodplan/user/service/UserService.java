package com.prodplan.user.service;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Optional;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public User createUser(String name, String email, Role role) {
        if (userRepository.findByEmail(email).isPresent()) {
            throw new IllegalArgumentException("User with this email already exists");
        }

        String pin = generateUniquePin();
        User user = new User(name, email, role, pin);
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String email, String pin) {
        return userRepository.findByEmailAndPin(email, pin);
    }

    private String generateUniquePin() {
        String pin;
        do {
            int num = 100000 + secureRandom.nextInt(900000); // 6 digit PIN
            pin = String.valueOf(num);
        } while (userRepository.findByPin(pin).isPresent());
        return pin;
    }
}
