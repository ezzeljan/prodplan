package com.prodplan.user.dto;

import com.prodplan.user.model.ChatThread;
import com.prodplan.user.model.ChatMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

public record ChatThreadResponse(
    Long id,
    Long projectId,
    String projectName,
    Long teamLeadId,
    String title,
    LocalDateTime createdAt,
    LocalDateTime updatedAt,
    List<MessageDTO> messages
) {

    public record MessageDTO(
        Long id,
        String role,
        String content,
        String messageType,
        Map<String, Object> fileData,
        Map<String, Object> previewData,
        LocalDateTime createdAt
    ) {
        public static MessageDTO from(ChatMessage m) {
            return new MessageDTO(
                m.getId(),
                m.getRole(),
                m.getContent(),
                m.getMessageType(),
                m.getFileData(),
                m.getPreviewData(),
                m.getCreatedAt()
            );
        }
    }

    public static ChatThreadResponse from(ChatThread thread) {
        return from(thread, thread.getMessages());
    }

    public static ChatThreadResponse from(ChatThread thread, List<ChatMessage> messages) {
        return new ChatThreadResponse(
            thread.getId(),
            thread.getProject().getId(),
            thread.getProject().getName(),
            thread.getTeamLead().getId(),
            thread.getTitle(),
            thread.getCreatedAt(),
            thread.getUpdatedAt(),
            messages.stream().map(MessageDTO::from).collect(Collectors.toList())
        );
    }
}