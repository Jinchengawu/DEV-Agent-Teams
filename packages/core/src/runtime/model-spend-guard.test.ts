import { describe, expect, it } from 'vitest';
import {
  createGuardedAgentResult,
  createGuardedRoutingDecision,
  isModelSpendGuardEnabled,
} from './model-spend-guard.js';

describe('model spend guard', () => {
  it('blocks live model calls when MODEL_SPEND_GUARD is enabled', () => {
    expect(isModelSpendGuardEnabled({ MODEL_SPEND_GUARD: '1' })).toBe(true);
    expect(isModelSpendGuardEnabled({ MODEL_SPEND_GUARD: 'true' })).toBe(true);
  });

  it('allows live model calls only with an explicit override', () => {
    expect(isModelSpendGuardEnabled({ MODEL_SPEND_GUARD: '1', ALLOW_LIVE_MODEL: '1' })).toBe(false);
  });

  it('returns zero-token guarded agent results', () => {
    const result = createGuardedAgentResult('dev-pm');

    expect(result.success).toBe(false);
    expect(result.output).toContain('MODEL_SPEND_GUARD');
    expect(result.tokenUsage).toEqual({ input_tokens: 0, output_tokens: 0 });
    expect(result.toolCalls).toHaveLength(0);
  });

  it('returns deterministic routing without external model calls', () => {
    const decision = createGuardedRoutingDecision();

    expect(decision.strategy).toBe('single');
    expect(decision.primaryAgent).toBe('dev-backend');
    expect(decision.reasoning).toContain('MODEL_SPEND_GUARD');
  });
});
