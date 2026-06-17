/**
 * RollbackManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { RollbackManager } from './rollback.js';

describe('RollbackManager', () => {
  let db: Database.Database;
  let rollback: RollbackManager;

  beforeEach(() => {
    db = new Database(':memory:');
    // 创建 messages 表（RollbackManager 回滚时需要删除消息）
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY, title TEXT, status TEXT, created_at TEXT, updated_at TEXT
      );
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT, role TEXT, agent_id TEXT,
        content TEXT, tokens INTEGER, created_at TEXT DEFAULT (datetime('now'))
      );
    `);
    rollback = new RollbackManager(db);
  });

  afterEach(() => {
    db.close();
  });

  it('应保存和获取快照', () => {
    rollback.saveSnapshot('s1', 1, '第一步', { data: 'hello' });
    const snapshot = rollback.getSnapshot('s1', 1);
    expect(snapshot).toBeTruthy();
    expect(snapshot?.description).toBe('第一步');
    expect(JSON.parse(snapshot!.state)).toEqual({ data: 'hello' });
  });

  it('应获取最新快照', () => {
    rollback.saveSnapshot('s1', 1, '步骤1', { a: 1 });
    rollback.saveSnapshot('s1', 2, '步骤2', { a: 2 });
    rollback.saveSnapshot('s1', 3, '步骤3', { a: 3 });

    const latest = rollback.getLatestSnapshot('s1');
    expect(latest?.step).toBe(3);
  });

  it('应获取所有快照', () => {
    rollback.saveSnapshot('s1', 1, '步骤1', {});
    rollback.saveSnapshot('s1', 2, '步骤2', {});
    rollback.saveSnapshot('s1', 3, '步骤3', {});

    const snapshots = rollback.getSnapshots('s1');
    expect(snapshots.length).toBe(3);
    expect(snapshots[0].step).toBe(1);
  });

  it('应回滚到指定步骤', () => {
    rollback.saveSnapshot('s1', 1, '步骤1', { state: 'v1' });
    rollback.saveSnapshot('s1', 2, '步骤2', { state: 'v2' });
    rollback.saveSnapshot('s1', 3, '步骤3', { state: 'v3' });

    const result = rollback.rollback('s1', 2);
    expect(result.success).toBe(true);
    expect(result.state).toEqual({ state: 'v2' });

    // 步骤 3 应被删除
    const snapshots = rollback.getSnapshots('s1');
    expect(snapshots.length).toBe(2);
  });

  it('回滚到不存在的步骤应失败', () => {
    const result = rollback.rollback('s1', 999);
    expect(result.success).toBe(false);
  });

  it('应删除会话的所有快照', () => {
    rollback.saveSnapshot('s1', 1, '步骤1', {});
    rollback.saveSnapshot('s1', 2, '步骤2', {});
    rollback.deleteSnapshots('s1');
    expect(rollback.getSnapshotCount('s1')).toBe(0);
  });

  it('应获取快照数量', () => {
    rollback.saveSnapshot('s1', 1, '步骤1', {});
    rollback.saveSnapshot('s1', 2, '步骤2', {});
    expect(rollback.getSnapshotCount('s1')).toBe(2);
  });
});
