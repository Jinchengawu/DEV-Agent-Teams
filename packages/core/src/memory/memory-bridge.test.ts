/**
 * MemoryBridge 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { MemoryBridge } from './memory-bridge.js';

// Mock ProfileManager
const createMockProfileManager = () => ({
  getProfile: (agentId: string) => ({
    agentId,
    name: agentId,
    role: '',
    port: 8000,
    status: 'running',
    restartCount: 0,
  }),
  getRunningProfiles: () => [],
  getAllProfiles: () => [],
  register: () => {},
  unregister: () => {},
  updateStatus: () => {},
  checkHealth: async () => ({ agentId: '', healthy: true, latency: 0 }),
  checkAllHealth: async () => [],
  startHealthCheckLoop: () => {},
  stopHealthCheckLoop: () => {},
  getSummary: () => ({ total: 0, running: 0, unhealthy: 0, stopped: 0 }),
  destroy: () => {},
});

describe('MemoryBridge', () => {
  let db: Database.Database;
  let bridge: MemoryBridge;

  beforeEach(() => {
    db = new Database(':memory:');
    bridge = new MemoryBridge(db, createMockProfileManager() as any);
  });

  afterEach(() => {
    db.close();
  });

  describe('共享状态', () => {
    it('应设置和获取共享状态', () => {
      bridge.setSharedState('project-name', 'DEV-Agent-Teams', 'frontend');
      const state = bridge.getSharedState('project-name');
      expect(state).toBeTruthy();
      expect(state?.value).toBe('DEV-Agent-Teams');
      expect(state?.owner).toBe('frontend');
      expect(state?.version).toBe(1);
    });

    it('应更新已有状态并递增版本', () => {
      bridge.setSharedState('key', 'v1', 'a');
      bridge.setSharedState('key', 'v2', 'b');

      const state = bridge.getSharedState('key');
      expect(state?.value).toBe('v2');
      expect(state?.owner).toBe('b');
      expect(state?.version).toBe(2);
    });

    it('应列出共享状态', () => {
      bridge.setSharedState('a', '1', 'frontend');
      bridge.setSharedState('b', '2', 'backend');

      const all = bridge.listSharedState();
      expect(all.length).toBe(2);

      const filtered = bridge.listSharedState('frontend');
      expect(filtered.length).toBe(1);
    });

    it('应删除共享状态', () => {
      bridge.setSharedState('key', 'value', 'a');
      expect(bridge.deleteSharedState('key')).toBe(true);
      expect(bridge.getSharedState('key')).toBeNull();
    });
  });

  describe('上下文注入', () => {
    it('应构建共享上下文', () => {
      bridge.setSharedState('project-name', 'DEV-Agent-Teams', 'frontend');
      bridge.setSharedState('project-version', 'v0.3.0', 'backend');

      const context = bridge.buildSharedContext();
      expect(context).toContain('## 团队共享状态');
      expect(context).toContain('project-name');
      expect(context).toContain('DEV-Agent-Teams');
    });

    it('应标注当前 Agent', () => {
      bridge.setSharedState('key', 'value', 'frontend');

      const context = bridge.buildSharedContext('frontend');
      expect(context).toContain('（本 Agent）');
    });

    it('无共享状态时返回空字符串', () => {
      expect(bridge.buildSharedContext()).toBe('');
    });
  });
});
