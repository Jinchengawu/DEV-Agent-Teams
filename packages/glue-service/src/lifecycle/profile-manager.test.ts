/**
 * ProfileManager 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from './profile-manager.js';

describe('ProfileManager', () => {
  let manager: ProfileManager;

  beforeEach(() => {
    manager = new ProfileManager({
      healthCheckInterval: 1000,
      healthCheckTimeout: 500,
      maxRestartCount: 3,
      autoRestart: true,
    });
  });

  it('应注册和获取 Profile', () => {
    manager.register({
      agentId: 'dev-frontend',
      name: 'Frontend Agent',
      role: '前端开发',
      port: 8201,
      skills: ['react'],
      tags: ['frontend'],
    });

    const profile = manager.getProfile('dev-frontend');
    expect(profile).toBeTruthy();
    expect(profile?.agentId).toBe('dev-frontend');
    expect(profile?.status).toBe('stopped');
  });

  it('应注销 Profile', () => {
    manager.register({ agentId: 'test', name: 'Test', role: '测试', port: 9000, skills: [], tags: [] });
    manager.unregister('test');
    expect(manager.getProfile('test')).toBeUndefined();
  });

  it('应更新状态', () => {
    manager.register({ agentId: 'test', name: 'Test', role: '测试', port: 9000, skills: [], tags: [] });
    manager.updateStatus('test', 'running');
    expect(manager.getProfile('test')?.status).toBe('running');
  });

  it('应获取运行中的 Profile', () => {
    manager.register({ agentId: 'a', name: 'A', role: '', port: 1, skills: [], tags: [] });
    manager.register({ agentId: 'b', name: 'B', role: '', port: 2, skills: [], tags: [] });
    manager.updateStatus('a', 'running');

    const running = manager.getRunningProfiles();
    expect(running.length).toBe(1);
    expect(running[0].agentId).toBe('a');
  });

  it('应返回状态摘要', () => {
    manager.register({ agentId: 'a', name: 'A', role: '', port: 1, skills: [], tags: [] });
    manager.register({ agentId: 'b', name: 'B', role: '', port: 2, skills: [], tags: [] });
    manager.updateStatus('a', 'running');
    manager.updateStatus('b', 'unhealthy');

    const summary = manager.getSummary();
    expect(summary.total).toBe(2);
    expect(summary.running).toBe(1);
    expect(summary.unhealthy).toBe(1);
  });

  it('应注册多个 Profile', () => {
    const configs = [
      { agentId: 'frontend', name: 'Frontend', role: '', port: 8201, skills: [], tags: [] },
      { agentId: 'backend', name: 'Backend', role: '', port: 8202, skills: [], tags: [] },
      { agentId: 'testing', name: 'Testing', role: '', port: 8203, skills: [], tags: [] },
    ];
    configs.forEach(c => manager.register(c));

    expect(manager.getAllProfiles().length).toBe(3);
  });
});
