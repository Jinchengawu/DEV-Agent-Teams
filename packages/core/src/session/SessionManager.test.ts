/**
 * SessionManager 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from './SessionManager.js';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { unlinkSync, existsSync } from 'node:fs';

describe('SessionManager', () => {
  let dbPath: string;
  let manager: SessionManager;

  beforeEach(() => {
    dbPath = join(tmpdir(), `test-sessions-${Date.now()}.db`);
    manager = new SessionManager(dbPath);
  });

  afterEach(() => {
    manager.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
  });

  describe('会话 CRUD', () => {
    it('应创建新会话', () => {
      const id = manager.createSession('user-1');
      expect(id).toBeTruthy();
      const session = manager.getSession(id);
      expect(session).toBeTruthy();
      expect(session?.status).toBe('active');
    });

    it('应支持自定义 sessionId', () => {
      const id = manager.createSession('', 'custom-id');
      expect(id).toBe('custom-id');
    });

    it('应列出所有活跃会话', () => {
      manager.createSession('user-1');
      manager.createSession('user-2');
      const sessions = manager.listSessions();
      expect(sessions.length).toBeGreaterThanOrEqual(2);
    });

    it('应更新会话标题', () => {
      const id = manager.createSession('user-1');
      manager.updateSession(id, { title: '测试标题' });
      const session = manager.getSession(id);
      expect(session?.title).toBe('测试标题');
    });

    it('应获取会话数量', () => {
      const before = manager.getSessionCount();
      manager.createSession('user-1');
      expect(manager.getSessionCount()).toBe(before + 1);
    });
  });

  describe('消息存储', () => {
    it('应添加和获取消息', () => {
      const sessionId = manager.createSession('user-1');
      manager.addMessage(sessionId, 'user', '你好');
      manager.addMessage(sessionId, 'assistant', '你好！有什么可以帮助你的？');

      const messages = manager.getMessages(sessionId);
      expect(messages.length).toBe(2);
      expect(messages[0].role).toBe('user');
      expect(messages[0].content).toBe('你好');
      expect(messages[1].role).toBe('assistant');
    });

    it('应支持 agentId', () => {
      const sessionId = manager.createSession('user-1');
      manager.addMessage(sessionId, 'assistant', '回复', 'dev-frontend');

      const messages = manager.getMessages(sessionId);
      expect(messages[0].agentId).toBe('dev-frontend');
    });

    it('应获取所有消息（跨会话）', () => {
      const s1 = manager.createSession('user-1');
      const s2 = manager.createSession('user-2');
      manager.addMessage(s1, 'user', '消息1');
      manager.addMessage(s2, 'user', '消息2');

      const all = manager.getAllMessages();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });

    it('应获取总消息数', () => {
      const s1 = manager.createSession('user-1');
      manager.addMessage(s1, 'user', '测试');
      const count = manager.getTotalMessageCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });

  describe('关闭', () => {
    it('应正常关闭不报错', () => {
      expect(() => manager.close()).not.toThrow();
    });
  });
});
