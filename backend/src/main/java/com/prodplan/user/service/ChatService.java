package com.prodplan.user.service;

import com.prodplan.user.model.ChatMessage;
import com.prodplan.user.model.ChatThread;
import com.prodplan.user.model.Project;
import com.prodplan.user.model.User;
import com.prodplan.user.repository.ChatMessageRepository;
import com.prodplan.user.repository.ChatThreadRepository;
import com.prodplan.user.repository.ProjectRepository;
import com.prodplan.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ChatService {

    private final ChatThreadRepository threadRepo;
    private final ChatMessageRepository messageRepo;
    private final ProjectRepository projectRepo;
    private final UserRepository userRepo;

    public ChatService(ChatThreadRepository threadRepo,
                       ChatMessageRepository messageRepo,
                       ProjectRepository projectRepo,
                       UserRepository userRepo) {
        this.threadRepo = threadRepo;
        this.messageRepo = messageRepo;
        this.projectRepo = projectRepo;
        this.userRepo = userRepo;
    }

    /**
     * Get or create a chat thread for a given project + team lead.
     * One thread per project per team lead.
     */
    @Transactional
    public ChatThread getOrCreateThread(Long projectId, Long teamLeadId) {
        Optional<ChatThread> existing = threadRepo.findByProjectIdAndTeamLeadId(projectId, teamLeadId);
        if (existing.isPresent()) return existing.get();

        Project project = projectRepo.findById(projectId)
            .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        User teamLead = userRepo.findById(teamLeadId)
            .orElseThrow(() -> new IllegalArgumentException("Team Lead not found: " + teamLeadId));

        ChatThread thread = new ChatThread();
        thread.setProject(project);
        thread.setTeamLead(teamLead);
        thread.setTitle("Chat – " + project.getName());
        return threadRepo.save(thread);
    }

    /**
     * Fetch all threads for a project (for sidebar listing).
     */
    public List<ChatThread> getThreadsByProject(Long projectId) {
        return threadRepo.findByProjectIdOrderByUpdatedAtDesc(projectId);
    }

    /**
     * Fetch all messages for a thread.
     */
    public List<ChatMessage> getMessages(Long threadId) {
        return messageRepo.findByChatThreadIdOrderByCreatedAtAsc(threadId);
    }

    /**
     * Append a single message to a thread.
     */
    @Transactional
    public ChatMessage addMessage(Long threadId, String role, String content,
                                   String messageType, Map<String, Object> fileData,
                                   Map<String, Object> previewData) {
        ChatThread thread = threadRepo.findById(threadId)
            .orElseThrow(() -> new IllegalArgumentException("Thread not found: " + threadId));

        ChatMessage msg = new ChatMessage();
        msg.setChatThread(thread);
        msg.setRole(role);
        msg.setContent(content);
        msg.setMessageType(messageType != null ? messageType : "text");
        msg.setFileData(fileData);
        msg.setPreviewData(previewData);

        // Update thread title from first user message if still default
        if ("user".equals(role) && thread.getTitle().startsWith("Chat – ")) {
            String newTitle = content.length() > 50 ? content.substring(0, 50) + "…" : content;
            thread.setTitle(newTitle);
            threadRepo.save(thread);
        }

        return messageRepo.save(msg);
    }

    /**
     * Update a thread's title.
     */
    @Transactional
    public ChatThread updateThreadTitle(Long threadId, String title) {
        ChatThread thread = threadRepo.findById(threadId)
            .orElseThrow(() -> new IllegalArgumentException("Thread not found: " + threadId));
        thread.setTitle(title);
        return threadRepo.save(thread);
    }

    /**
     * Delete a specific thread and all its messages (cascade).
     */
    @Transactional
    public void deleteThread(Long threadId) {
        threadRepo.deleteById(threadId);
    }

    /**
     * Delete all threads for a project+team lead.
     */
    @Transactional
    public void deleteAllThreadsForTeamLead(Long teamLeadId) {
        List<ChatThread> threads = threadRepo.findByTeamLeadIdOrderByUpdatedAtDesc(teamLeadId);
        threadRepo.deleteAll(threads);
    }
}