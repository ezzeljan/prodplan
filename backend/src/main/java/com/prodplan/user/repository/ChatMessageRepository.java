package com.prodplan.user.repository;

import com.prodplan.user.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Fetch all messages for a thread, sorted by creation time (oldest first)
    List<ChatMessage> findByChatThreadIdOrderByCreatedAtAsc(Long chatThreadId);

    // Delete all messages in a thread (used for reset)
    void deleteByChatThreadId(Long chatThreadId);
}