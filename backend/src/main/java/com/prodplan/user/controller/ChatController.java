package com.prodplan.user.controller;

import com.prodplan.user.dto.ChatThreadResponse;
import com.prodplan.user.model.ChatMessage;
import com.prodplan.user.model.ChatThread;
import com.prodplan.user.model.Role;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.ChatMessageRepository;
import com.prodplan.user.service.ChatService;
import com.prodplan.user.service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*", methods = {
    RequestMethod.GET,
    RequestMethod.POST,
    RequestMethod.PUT,
    RequestMethod.DELETE,
    RequestMethod.OPTIONS
})
public class ChatController {

    private final ChatService chatService;
    private final UserService userService;
    private final ChatMessageRepository messageRepo;

    public ChatController(ChatService chatService, UserService userService,
                          ChatMessageRepository messageRepo) {
        this.chatService = chatService;
        this.userService = userService;
        this.messageRepo = messageRepo;
    }

    /**
     * GET /api/chat/thread?projectId=X&teamLeadId=Y&callerEmail=..&callerPin=..
     * Returns the thread for this project+teamLead (creates if not existing).
     * Also returns all messages under that thread.
     */
    @GetMapping("/thread")
    public ResponseEntity<?> getOrCreateThread(
            @RequestParam Long projectId,
            @RequestParam Long teamLeadId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {

        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }
        User caller = callerOpt.get();
        if (caller.getRole() != Role.TEAM_LEAD && caller.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Team Leads can access chat"));
        }

        ChatThread thread = chatService.getOrCreateThread(projectId, teamLeadId);
        List<ChatMessage> messages = chatService.getMessages(thread.getId());
        return ResponseEntity.ok(ChatThreadResponse.from(thread, messages));
    }

    /**
     * POST /api/chat/thread/{threadId}/messages
     * Adds a single message (user or agent) to the thread.
     * Body: { role, content, messageType?, fileData?, previewData?, callerEmail, callerPin }
     */
    @PostMapping("/thread/{threadId}/messages")
    public ResponseEntity<?> addMessage(
            @PathVariable Long threadId,
            @RequestBody AddMessageRequest request) {

        Optional<User> callerOpt = userService.authenticate(request.callerEmail(), request.callerPin());
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }
        User caller = callerOpt.get();
        if (caller.getRole() != Role.TEAM_LEAD && caller.getRole() != Role.ADMIN) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only Team Leads can post messages"));
        }

        ChatMessage msg = chatService.addMessage(
            threadId,
            request.role(),
            request.content(),
            request.messageType(),
            request.fileData(),
            request.previewData()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(ChatThreadResponse.MessageDTO.from(msg));
    }

    /**
     * GET /api/chat/thread/{threadId}/messages
     * Returns all messages for a thread.
     */
    @GetMapping("/thread/{threadId}/messages")
    public ResponseEntity<?> getMessages(
            @PathVariable Long threadId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {

        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        List<ChatMessage> messages = chatService.getMessages(threadId);
        return ResponseEntity.ok(messages.stream().map(ChatThreadResponse.MessageDTO::from).toList());
    }

    /**
     * DELETE /api/chat/thread/{threadId}
     * Deletes a thread and all its messages.
     */
    @DeleteMapping("/thread/{threadId}")
    public ResponseEntity<?> deleteThread(
            @PathVariable Long threadId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {

        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        chatService.deleteThread(threadId);
        return ResponseEntity.ok(Map.of("message", "Thread deleted"));
    }

    /**
     * DELETE /api/chat/all?teamLeadId=X&callerEmail=..&callerPin=..
     * Deletes ALL threads for a team lead.
     */
    @DeleteMapping("/all")
    public ResponseEntity<?> deleteAllForTeamLead(
            @RequestParam Long teamLeadId,
            @RequestParam String callerEmail,
            @RequestParam String callerPin) {

        Optional<User> callerOpt = userService.authenticate(callerEmail, callerPin);
        if (callerOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication failed"));
        }

        chatService.deleteAllThreadsForTeamLead(teamLeadId);
        return ResponseEntity.ok(Map.of("message", "All threads deleted"));
    }

    public record AddMessageRequest(
        String role,
        String content,
        String messageType,
        Map<String, Object> fileData,
        Map<String, Object> previewData,
        String callerEmail,
        String callerPin
    ) {}
}