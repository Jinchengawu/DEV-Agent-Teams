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
});
