/**
 * TokenTracker 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TokenTracker } from './token-tracker.js';

describe('TokenTracker', () => {
  let tracker: TokenTracker;

  beforeEach(() => {
    tracker = new TokenTracker({
      pricing: { inputPrice: 2.0, outputPrice: 6.0 },
    });
  });

  it('应记录 Token 使用', () => {
    const record = tracker.track('frontend', 'chat', 1000, 500);
    expect(record.agentId).toBe('frontend');
    expect(record.inputTokens).toBe(1000);
    expect(record.outputTokens).toBe(500);
    expect(record.totalTokens).toBe(1500);
    expect(record.cost).toBeGreaterThan(0);
  });

  it('应计算成本', () => {
    // 1000 input * 2.0/1M + 500 output * 6.0/1M = 0.002 + 0.003 = 0.005
    const cost = tracker.calculateCost(1000, 500);
    expect(cost).toBeCloseTo(0.005, 6);
  });

  it('应统计总使用量', () => {
    tracker.track('a', 'chat', 1000, 500);
    tracker.track('b', 'meeting', 2000, 1000);

    const total = tracker.getTotalUsage();
    expect(total.tokens).toBe(4500);
    expect(total.count).toBe(2);
  });

  it('应按 Agent 统计', () => {
    tracker.track('frontend', 'chat', 1000, 500);
    tracker.track('frontend', 'chat', 2000, 1000);
    tracker.track('backend', 'chat', 500, 200);

    const byAgent = tracker.getByAgent();
    expect(byAgent.get('frontend')?.tokens).toBe(4500);
    expect(byAgent.get('backend')?.tokens).toBe(700);
  });

  it('应按任务类型统计', () => {
    tracker.track('a', 'chat', 1000, 500);
    tracker.track('b', 'meeting', 2000, 1000);

    const byType = tracker.getByTaskType();
    expect(byType.get('chat')?.count).toBe(1);
    expect(byType.get('meeting')?.count).toBe(1);
  });

  it('应获取最近记录', () => {
    for (let i = 0; i < 10; i++) {
      tracker.track('a', 'chat', i * 100, i * 50);
    }

    const recent = tracker.getRecent(3);
    expect(recent.length).toBe(3);
    expect(recent[0].inputTokens).toBe(700);
  });

  it('应清空记录', () => {
    tracker.track('a', 'chat', 1000, 500);
    tracker.clear();
    expect(tracker.getTotalUsage().count).toBe(0);
  });
});
