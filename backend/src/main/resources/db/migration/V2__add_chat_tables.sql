-- Create chat_threads table
CREATE TABLE IF NOT EXISTS chat_threads (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    project_id BIGINT NOT NULL,
    team_lead_id BIGINT NOT NULL,
    title VARCHAR(255) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_threads_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_chat_threads_team_lead FOREIGN KEY (team_lead_id) REFERENCES users(id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    chat_thread_id BIGINT NOT NULL,
    role VARCHAR(50) NOT NULL,
    content LONGTEXT NOT NULL,
    message_type VARCHAR(50) NOT NULL DEFAULT 'text',
    file_data JSON NULL,
    preview_data JSON NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_chat_messages_thread FOREIGN KEY (chat_thread_id) REFERENCES chat_threads(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_chat_threads_project ON chat_threads(project_id);
CREATE INDEX idx_chat_threads_team_lead ON chat_threads(team_lead_id);
CREATE INDEX idx_chat_messages_thread ON chat_messages(chat_thread_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);
