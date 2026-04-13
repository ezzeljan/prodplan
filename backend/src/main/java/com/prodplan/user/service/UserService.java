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

    public User createUser(String name, String email, Role role, String manualPin) {
        // Email is no longer required to be unique as they share company format
        String pin = (manualPin != null && !manualPin.isBlank()) ? manualPin : generateUniquePin();
        
        // Ensure the chosen PIN isn't already taken
        if (manualPin != null && !manualPin.isBlank() && userRepository.findByPin(pin).isPresent()) {
             throw new IllegalArgumentException("Target PIN is already assigned to another user.");
        }

        User user = new User(name, email, role, pin);
        return userRepository.save(user);
    }

    public Optional<User> authenticate(String email, String pin) {
        Optional<User> userOpt = userRepository.findByPin(pin);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Admin and PM MUST match specialized email + password (PIN)
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.PROJECT_MANAGER) {
                if (user.getEmail().equalsIgnoreCase(email)) {
                    return userOpt;
                } else {
                    return Optional.empty();
                }
            }
            // PM and Operators are PIN-centric
            return userOpt;
        }
        return Optional.empty();
    }

    public java.util.List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }
        userRepository.deleteById(id);
    }

    public User updateUser(Long id, String name, String email, Role role, String pin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (pin != null && !pin.isBlank() && !pin.equals(user.getPin())) {
            if (userRepository.findByPin(pin).isPresent()) {
                throw new IllegalArgumentException("Target PIN is already assigned to another user.");
            }
            user.setPin(pin);
        }

        if (name != null) user.setName(name);
        if (email != null) user.setEmail(email);
        if (role != null) user.setRole(role);

        return userRepository.save(user);
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
