package com.prodplan.user.controller;

import com.prodplan.user.model.User;
import com.prodplan.user.repository.UserRepository;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.stream.Collectors;

@RestController
public class DebugController {

    private final UserRepository userRepository;

    public DebugController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @GetMapping("/api/debug/users")
    public List<String> listUsers() {
        return userRepository.findAll().stream()
                .map(u -> u.getEmail() + " (PIN: " + u.getPin() + ")")
                .collect(Collectors.toList());
    }
}
