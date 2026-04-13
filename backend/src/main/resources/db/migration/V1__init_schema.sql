CREATE TABLE IF NOT EXISTS users (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(255) NOT NULL,
    pin VARCHAR(255) NOT NULL,
    CONSTRAINT uk_users_email UNIQUE (email),
    CONSTRAINT uk_users_pin UNIQUE (pin)
);

CREATE TABLE IF NOT EXISTS projects (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    description VARCHAR(255) NULL,
    name VARCHAR(255) NULL,
    project_manager_id BIGINT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    goal INT NOT NULL DEFAULT 0,
    unit VARCHAR(100) NOT NULL DEFAULT '',
    start_date DATE NULL,
    end_date DATE NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    google_sheet_url VARCHAR(1024) NULL,
    spreadsheet_data JSON NULL,
    CONSTRAINT fk_projects_manager FOREIGN KEY (project_manager_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS project_operators (
    project_id BIGINT NOT NULL,
    operator_id BIGINT NOT NULL,
    PRIMARY KEY (project_id, operator_id),
    CONSTRAINT fk_project_operators_project FOREIGN KEY (project_id) REFERENCES projects(id),
    CONSTRAINT fk_project_operators_user FOREIGN KEY (operator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS daily_outputs (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    amount INT NULL,
    date DATE NULL,
    operator_id BIGINT NULL,
    project_id BIGINT NULL,
    CONSTRAINT fk_daily_outputs_operator FOREIGN KEY (operator_id) REFERENCES users(id),
    CONSTRAINT fk_daily_outputs_project FOREIGN KEY (project_id) REFERENCES projects(id)
);

UPDATE projects
SET
    status = COALESCE(NULLIF(status, ''), 'active'),
    goal = COALESCE(goal, 0),
    unit = COALESCE(unit, ''),
    start_date = COALESCE(start_date, CURRENT_DATE()),
    end_date = COALESCE(end_date, CURRENT_DATE()),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE
    status IS NULL
    OR status = ''
    OR goal IS NULL
    OR unit IS NULL
    OR start_date IS NULL
    OR end_date IS NULL
    OR created_at IS NULL
    OR updated_at IS NULL;

UPDATE projects
SET spreadsheet_data = JSON_OBJECT('columns', JSON_ARRAY(), 'rows', JSON_ARRAY(), 'merges', JSON_ARRAY())
WHERE spreadsheet_data IS NULL;
