import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/todos.db');

// 确保数据目录存在
import fs from 'fs';
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export function createDatabase(dbPath: string = DB_PATH): Database.Database {
  const db = new Database(dbPath);
  
  // 启用 WAL 模式以提高并发性能
  db.pragma('journal_mode = WAL');
  
  // 创建 todos 表
  db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // 创建索引
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
    CREATE INDEX IF NOT EXISTS idx_todos_created_at ON todos(created_at);
  `);

  return db;
}

// 默认数据库实例
let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = createDatabase();
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}
