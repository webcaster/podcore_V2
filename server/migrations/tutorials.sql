CREATE TABLE IF NOT EXISTS tutorials (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  enabled INTEGER DEFAULT 1,
  steps TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS user_tutorial_progress (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tutorial_id TEXT NOT NULL,
  completed INTEGER DEFAULT 0,
  completed_at DATETIME,
  skipped INTEGER DEFAULT 0,
  current_step INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (tutorial_id) REFERENCES tutorials(id),
  UNIQUE(user_id, tutorial_id)
);

CREATE INDEX IF NOT EXISTS idx_tutorials_role ON tutorials(role);
CREATE INDEX IF NOT EXISTS idx_user_tutorial_progress_user ON user_tutorial_progress(user_id);
