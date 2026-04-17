package com.prodplan.user.model;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.LocalDateTime;
import java.util.Map;

@Entity
@Table(name = "chat_messages")
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_thread_id", nullable = false)
    private ChatThread chatThread;

    // "agent" or "user"
    @Column(nullable = false, length = 50)
    private String role;

    // Full message content (can be very long)
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String content;

    // "text", "file", "preview", "google-sheet"
    @Column(name = "message_type", nullable = false, length = 50)
    private String messageType = "text";

    // Stores file metadata: { name, url }
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "file_data", columnDefinition = "JSON")
    private Map<String, Object> fileData;

    // Stores preview data (for spreadsheet previews)
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "preview_data", columnDefinition = "JSON")
    private Map<String, Object> previewData;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public ChatThread getChatThread() { return chatThread; }
    public void setChatThread(ChatThread chatThread) { this.chatThread = chatThread; }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public String getMessageType() { return messageType; }
    public void setMessageType(String messageType) { this.messageType = messageType; }

    public Map<String, Object> getFileData() { return fileData; }
    public void setFileData(Map<String, Object> fileData) { this.fileData = fileData; }

    public Map<String, Object> getPreviewData() { return previewData; }
    public void setPreviewData(Map<String, Object> previewData) { this.previewData = previewData; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}