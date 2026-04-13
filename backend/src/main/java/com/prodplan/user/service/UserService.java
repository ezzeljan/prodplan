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
        try {
            return userRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error: Likely a duplicate PIN or email usage.");
        }
    }

    public Optional<User> authenticate(String email, String pin) {
        if (email == null || pin == null) return Optional.empty();
        
        String trimmedEmail = email.trim();
        String trimmedPin = pin.trim();
        
        Optional<User> userOpt = userRepository.findByPin(trimmedPin);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // Admin and Team Lead MUST match specialized email + password (PIN)
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.TEAM_LEAD) {
                if (user.getEmail().equalsIgnoreCase(trimmedEmail)) {
                    return userOpt;
                } else {
                    return Optional.empty();
                }
            }
            // Operators are PIN-centric
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

        try {
            return userRepository.save(user);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new IllegalArgumentException("Database error: Likely a duplicate PIN or email usage.");
        }
    }

    private String generateUniquePin() {
        String pin;
        do {
            // Generated 6-digit PIN as requested
            long num = 100000L + (long)(secureRandom.nextDouble() * 900000L);
            pin = String.valueOf(num);
        } while (userRepository.findByPin(pin).isPresent());
        return pin;
    }
}
