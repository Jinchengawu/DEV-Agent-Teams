/**
 * OutputJudge 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { OutputJudge } from './judge.js';
import type { LLMCaller } from './judge.js';

describe('OutputJudge', () => {
  let judge: OutputJudge;
  let mockLLM: LLMCaller;

  beforeEach(() => {
    mockLLM = {
      call: async () => JSON.stringify({
        scores: { relevance: 9, completeness: 8, accuracy: 9, clarity: 8, efficiency: 7 },
        feedback: '输出质量良好',
        suggestions: ['可以更简洁', '添加更多示例'],
      }),
    };
    judge = new OutputJudge(mockLLM);
  });

  it('应评估 Agent 输出', async () => {
    const result = await judge.evaluate({
      agentId: 'frontend',
      taskType: 'chat',
      task: '创建一个 React 组件',
      output: 'function Button() { return <button>Click</button>; }',
    });

    expect(result.agentId).toBe('frontend');
    expect(result.scores.relevance).toBe(9);
    expect(result.overallScore).toBeGreaterThan(0);
    expect(result.feedback).toBe('输出质量良好');
    expect(result.suggestions.length).toBe(2);
  });

  it('应获取评估历史', async () => {
    await judge.evaluate({ agentId: 'a', taskType: 'chat', task: 't1', output: 'o1' });
    await judge.evaluate({ agentId: 'b', taskType: 'chat', task: 't2', output: 'o2' });

    expect(judge.getEvaluations().length).toBe(2);
    expect(judge.getEvaluations('a').length).toBe(1);
  });

  it('应计算平均评分', async () => {
    await judge.evaluate({ agentId: 'a', taskType: 'chat', task: 't1', output: 'o1' });
    await judge.evaluate({ agentId: 'a', taskType: 'chat', task: 't2', output: 'o2' });

    const avg = judge.getAverageScore('a');
    expect(avg).toBeGreaterThan(0);
  });

  it('LLM 调用失败时应返回默认评分', async () => {
    const failLLM: LLMCaller = { call: async () => { throw new Error('API error'); } };
    const failJudge = new OutputJudge(failLLM);

    const result = await failJudge.evaluate({
      agentId: 'test',
      taskType: 'chat',
      task: '任务',
      output: '输出',
    });

    expect(result.overallScore).toBe(5);
    expect(result.feedback).toContain('评估失败');
  });

  it('应清空评估历史', async () => {
    await judge.evaluate({ agentId: 'a', taskType: 'chat', task: 't', output: 'o' });
    judge.clear();
    expect(judge.getEvaluations().length).toBe(0);
  });
});
