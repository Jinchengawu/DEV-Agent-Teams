export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK(role IN ('user','assistant','system')),
  agent_id    TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL,
  tokens      INTEGER NOT NULL DEFAULT 0,
  attachments TEXT,                    -- JSON 数组 [{filename, path, type, size}]
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id, created_at);

-- 任务表（看板）
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  assignee    TEXT NOT NULL DEFAULT '',
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  task_type   TEXT NOT NULL DEFAULT 'feature' CHECK(task_type IN ('feature', 'bug', 'refactor', 'test', 'deploy', 'doc')),
  session_id  TEXT,
  milestone_id TEXT,
  parent_id   TEXT,
  progress    INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  tags        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  due_at      TEXT,
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);

-- 里程碑表
CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'overdue', 'cancelled')),
  target_date TEXT NOT NULL,
  completed_at TEXT,
  progress    INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);

-- 代码快照表
CREATE TABLE IF NOT EXISTS snapshots (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL,
  description TEXT,
  files       TEXT NOT NULL,                    -- JSON 数组 [{filename, content, language}]
  commit_message TEXT,
  external_url TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id, created_at);

-- 用户表（预留）
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  clerk_id    TEXT UNIQUE,
  email       TEXT,
  name        TEXT,
  avatar      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 工作流状态表（Phase 4: 断点续传）
CREATE TABLE IF NOT EXISTS workflow_states (
  id          TEXT PRIMARY KEY,
  goal        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'running' CHECK(status IN ('running', 'paused', 'completed', 'failed')),
  current_step INTEGER NOT NULL DEFAULT 0,
  total_steps INTEGER NOT NULL DEFAULT 0,
  steps       TEXT NOT NULL DEFAULT '[]',       -- JSON 数组 [{index, agentId, goal, output, status}]
  context     TEXT NOT NULL DEFAULT '{}',       -- JSON 对象 {sharedMemory, discussion}
  token_usage TEXT NOT NULL DEFAULT '{}',       -- JSON 对象 {input_tokens, output_tokens}
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_workflow_states_status ON workflow_states(status);
CREATE INDEX IF NOT EXISTS idx_workflow_states_created ON workflow_states(created_at);
`;

export function initSchema(db: { exec: (sql: string) => void }): void {
  db.exec(SCHEMA_SQL);
}
