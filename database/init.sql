-- CI/CD Pipeline Health Dashboard Database Schema

-- Create tables
CREATE TABLE IF NOT EXISTS repositories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL DEFAULT 'github',
    url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    run_id VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL,
    conclusion VARCHAR(50),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    commit_sha VARCHAR(40),
    commit_message TEXT,
    branch VARCHAR(255),
    author VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    repository_id INTEGER REFERENCES repositories(id),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    recipients TEXT[]
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_repo_id ON pipeline_runs(repository_id);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_status ON pipeline_runs(status);
CREATE INDEX IF NOT EXISTS idx_pipeline_runs_started_at ON pipeline_runs(started_at);

-- Insert sample data (optional)
INSERT INTO repositories (name, full_name, platform, url) VALUES 
('sample-repo', 'username/sample-repo', 'github', 'https://github.com/username/sample-repo')
ON CONFLICT (full_name) DO NOTHING;
