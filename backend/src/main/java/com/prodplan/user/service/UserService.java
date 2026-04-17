package com.prodplan.user.service;

import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        
        // Ensure the chosen PIN isn't already taken by an active user
        if (manualPin != null && !manualPin.isBlank() && userRepository.findByPinAndStatusNot(pin, "deleted").isPresent()) {
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
        
        String trimmedEmail = email != null ? email.trim() : null;
        String trimmedPin = pin.trim();
        
        // If email is provided, try to find a privileged user first
        if (trimmedEmail != null && !trimmedEmail.isBlank()) {
            Optional<User> privilegedOpt = userRepository.findByEmailAndPinAndStatusNot(trimmedEmail, trimmedPin, "deleted");
            if (privilegedOpt.isPresent()) return privilegedOpt;
        }

        // Fallback or Operator login (PIN only)
        Optional<User> userOpt = userRepository.findByPinAndStatusNot(trimmedPin, "deleted");
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            // If they are Admin/Lead, they MUST have checked email already
            if (user.getRole() == Role.ADMIN || user.getRole() == Role.TEAM_LEAD) {
                if (trimmedEmail != null && user.getEmail().equalsIgnoreCase(trimmedEmail)) {
                    return userOpt;
                }
                return Optional.empty();
            }
            return userOpt;
        }
        return Optional.empty();
    }

    public java.util.List<User> getAllUsers() {
        return userRepository.findByStatusNot("deleted");
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new IllegalArgumentException("User not found");
        }
        userRepository.updateUserStatus(id, "deleted");
    }

    public User updateUser(Long id, String name, String email, Role role, String pin) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        if (pin != null && !pin.isBlank() && !pin.equals(user.getPin())) {
            if (userRepository.findByPinAndStatusNot(pin, "deleted").isPresent()) {
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
        } while (userRepository.findByPinAndStatusNot(pin, "deleted").isPresent());
        return pin;
    }
}
