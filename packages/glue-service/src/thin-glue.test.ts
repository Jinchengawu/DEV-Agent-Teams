/**
 * ThinGlue 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProfileManager } from './lifecycle/profile-manager.js';
import { ThinGlue } from './thin-glue.js';

describe('ThinGlue', () => {
  let profileManager: ProfileManager;
  let thinGlue: ThinGlue;

  beforeEach(() => {
    profileManager = new ProfileManager();
    thinGlue = new ThinGlue(profileManager, { enableFallback: true });
  });

  it('应设置 fallback 处理器', () => {
    thinGlue.setFallbackHandler(async (req) => ({
      agentId: req.agentId,
      output: 'fallback response',
      tokens: 10,
      duration: 0,
      source: 'fallback',
    }));
    expect(thinGlue).toBeTruthy();
  });

  it('Profile 不可用时应使用 fallback', async () => {
    profileManager.register({
      agentId: 'test',
      name: 'Test',
      role: '测试',
      port: 9999,
      skills: [],
      tags: [],
    });

    thinGlue.setFallbackHandler(async (req) => ({
      agentId: req.agentId,
      output: 'fallback result',
      tokens: 10,
      duration: 0,
      source: 'fallback',
    }));

    const response = await thinGlue.executeTask({
      agentId: 'test',
      task: '测试任务',
    });

    expect(response.source).toBe('fallback');
    expect(response.output).toBe('fallback result');
  });

  it('无 Profile 且无 fallback 应抛出错误', async () => {
    await expect(
      thinGlue.executeTask({ agentId: 'unknown', task: 'test' })
    ).rejects.toThrow('No available handler');
  });

  it('应批量并行执行任务', async () => {
    // 注册多个 Profile（未启动，会使用 fallback）
    ['frontend', 'backend', 'testing'].forEach(id => {
      profileManager.register({ agentId: id, name: id, role: '', port: 8000, skills: [], tags: [] });
    });

    thinGlue.setFallbackHandler(async (req) => ({
      agentId: req.agentId,
      output: `${req.agentId} result`,
      tokens: 10,
      duration: 0,
      source: 'fallback',
    }));

    const results = await thinGlue.executeParallel([
      { agentId: 'frontend', task: '创建 header' },
      { agentId: 'backend', task: '创建 API' },
      { agentId: 'testing', task: '写测试' },
    ]);

    expect(results.results.size).toBe(3);
    expect(results.failed).toHaveLength(0);
    expect(results.totalTokens).toBe(30);
  });

  it('批量任务部分失败应记录失败', async () => {
    profileManager.register({ agentId: 'valid', name: 'Valid', role: '', port: 8000, skills: [], tags: [] });

    thinGlue.setFallbackHandler(async (req) => {
      if (req.agentId === 'invalid') throw new Error('Agent not found');
      return { agentId: req.agentId, output: 'ok', tokens: 10, duration: 0, source: 'fallback' };
    });

    const results = await thinGlue.executeParallel([
      { agentId: 'valid', task: 'task1' },
      { agentId: 'invalid', task: 'task2' },
    ]);

    expect(results.results.size).toBe(1);
    expect(results.failed).toContain('invalid');
  });
});
