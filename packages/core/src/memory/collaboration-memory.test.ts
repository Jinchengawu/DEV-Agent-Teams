/**
 * CollaborationMemory 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { CollaborationMemory } from './collaboration-memory.js';

describe('CollaborationMemory', () => {
  let db: Database.Database;
  let memory: CollaborationMemory;

  beforeEach(() => {
    db = new Database(':memory:');
    memory = new CollaborationMemory(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('会话 CRUD', () => {
    it('应创建和获取会话', () => {
      const id = memory.createSession('架构讨论', '讨论系统架构', ['frontend', 'backend']);
      const session = memory.getSession(id);
      expect(session).toBeTruthy();
      expect(session?.title).toBe('架构讨论');
      expect(session?.participants).toEqual(['frontend', 'backend']);
      expect(session?.status).toBe('active');
    });

    it('应列出会话', () => {
      memory.createSession('会话1', '目标1');
      memory.createSession('会话2', '目标2');
      const sessions = memory.listSessions();
      expect(sessions.length).toBe(2);
    });

    it('应按状态过滤会话', () => {
      const id = memory.createSession('会话1', '目标1');
      memory.createSession('会话2', '目标2');
      memory.archiveSession(id);

      const active = memory.listSessions('active');
      expect(active.length).toBe(1);
    });

    it('应归档会话', () => {
      const id = memory.createSession('测试', '目标');
      memory.archiveSession(id);
      const session = memory.getSession(id);
      expect(session?.status).toBe('archived');
    });

    it('应标记为已解决', () => {
      const id = memory.createSession('测试', '目标');
      memory.resolveSession(id);
      const session = memory.getSession(id);
      expect(session?.status).toBe('resolved');
      expect(session?.resolved_at).toBeTruthy();
    });
  });

  describe('评论', () => {
    it('应添加和获取评论', () => {
      const sessionId = memory.createSession('测试', '目标');
      memory.addComment(sessionId, 'frontend', '我觉得应该用 React', 1, 100);
      memory.addComment(sessionId, 'backend', '我建议用 Express', 1, 80);

      const comments = memory.getComments(sessionId);
      expect(comments.length).toBe(2);
      expect(comments[0].agent_id).toBe('frontend');
      expect(comments[1].agent_id).toBe('backend');
    });

    it('应按轮次获取评论', () => {
      const sessionId = memory.createSession('测试', '目标');
      memory.addComment(sessionId, 'a', '第1轮', 1);
      memory.addComment(sessionId, 'b', '第1轮', 1);
      memory.addComment(sessionId, 'a', '第2轮', 2);

      const round1 = memory.getComments(sessionId, 1);
      expect(round1.length).toBe(2);
    });

    it('应统计评论数量', () => {
      const sessionId = memory.createSession('测试', '目标');
      memory.addComment(sessionId, 'a', '1', 1);
      memory.addComment(sessionId, 'b', '2', 1);
      expect(memory.getCommentCount(sessionId)).toBe(2);
    });
  });

  describe('快照', () => {
    it('应保存和获取快照', () => {
      const sessionId = memory.createSession('测试', '目标');
      memory.saveSnapshot(sessionId, '决议内容', '会议摘要', 500, 12000);

      const snapshots = memory.getSnapshots(sessionId);
      expect(snapshots.length).toBe(1);
      expect(snapshots[0].resolution).toBe('决议内容');
    });

    it('应获取最新快照', () => {
      const sessionId = memory.createSession('测试', '目标');
      memory.saveSnapshot(sessionId, 'v1', '摘要1', 100, 1000);
      memory.saveSnapshot(sessionId, 'v2', '摘要2', 200, 2000);

      const latest = memory.getLatestSnapshot(sessionId);
      expect(latest?.resolution).toBe('v2');
    });
  });

  describe('统计', () => {
    it('应返回会话统计', () => {
      const sessionId = memory.createSession('测试', '目标', ['a', 'b']);
      memory.addComment(sessionId, 'a', '评论1', 1, 100);
      memory.addComment(sessionId, 'b', '评论2', 1, 80);
      memory.addComment(sessionId, 'a', '评论3', 2, 120);

      const stats = memory.getSessionStats(sessionId);
      expect(stats.commentCount).toBe(3);
      expect(stats.totalTokens).toBe(300);
      expect(stats.participants).toEqual(['a', 'b']);
      expect(stats.rounds).toBe(2);
    });
  });
});
