package com.prodplan.user.repository;

import com.prodplan.user.model.ChatThread;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ChatThreadRepository extends JpaRepository<ChatThread, Long> {

    // Find all threads for a given project (used when TL opens a project chat)
    List<ChatThread> findByProjectIdOrderByUpdatedAtDesc(Long projectId);

    // Find thread for specific project + team lead combo (one thread per project per TL)
    Optional<ChatThread> findByProjectIdAndTeamLeadId(Long projectId, Long teamLeadId);

    // All threads for a team lead
    List<ChatThread> findByTeamLeadIdOrderByUpdatedAtDesc(Long teamLeadId);
}