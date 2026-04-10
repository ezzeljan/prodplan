package com.prodplan.user.controller;

import com.prodplan.user.model.DailyOutput;
import com.prodplan.user.model.User;
import com.prodplan.user.service.DailyOutputService;
import com.prodplan.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/outputs")
@CrossOrigin(origins = "*")
public class OutputController {

    private final DailyOutputService dailyOutputService;
    private final UserService userService;

    public OutputController(DailyOutputService dailyOutputService, UserService userService) {
        this.dailyOutputService = dailyOutputService;
        this.userService = userService;
    }

    @PostMapping
    public ResponseEntity<?> submitOutput(@RequestBody SubmitOutputRequest request) {
        // Authenticate operator
        Optional<User> operatorOpt = userService.authenticate(request.email(), request.pin());
        if (operatorOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        try {
            DailyOutput output = dailyOutputService.submitOutput(
                    operatorOpt.get().getId(), 
                    request.projectId(), 
                    request.amount(), 
                    request.date() != null ? request.date() : LocalDate.now()
            );
            return ResponseEntity.status(HttpStatus.CREATED).body(output);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/project/{projectId}")
    public ResponseEntity<?> getProjectOutputs(@PathVariable Long projectId) {
        return ResponseEntity.ok(dailyOutputService.getOutputsByProject(projectId));
    }

    public record SubmitOutputRequest(String email, String pin, Long projectId, Integer amount, LocalDate date) {}
}
