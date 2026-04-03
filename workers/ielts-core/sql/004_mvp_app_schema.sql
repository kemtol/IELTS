PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  verification_code TEXT,
  target_score REAL,
  daily_minutes INTEGER,
  focus_skills TEXT,
  exam_date TEXT,
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
  baseline_score REAL,
  placement_completed INTEGER NOT NULL DEFAULT 0 CHECK (placement_completed IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS placement_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  total_questions INTEGER NOT NULL,
  answered_questions INTEGER NOT NULL,
  correct_answers INTEGER NOT NULL,
  score_percent INTEGER NOT NULL,
  estimated_band REAL NOT NULL,
  answers_json TEXT NOT NULL,
  results_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS study_plans (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS practice_tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_date TEXT NOT NULL,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  meta TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  score REAL,
  completed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE (user_id, task_date, task_type)
);

CREATE TABLE IF NOT EXISTS writing_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  response_text TEXT NOT NULL,
  word_count INTEGER NOT NULL,
  score REAL NOT NULL,
  feedback_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES practice_tasks(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS speaking_attempts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  task_id TEXT,
  duration_seconds INTEGER NOT NULL,
  transcript TEXT,
  score REAL NOT NULL,
  feedback_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES practice_tasks(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expiry ON auth_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_placement_attempts_user ON placement_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_plans_user ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_tasks_user_date ON practice_tasks(user_id, task_date);
CREATE INDEX IF NOT EXISTS idx_writing_attempts_user ON writing_attempts(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_speaking_attempts_user ON speaking_attempts(user_id, created_at DESC);
