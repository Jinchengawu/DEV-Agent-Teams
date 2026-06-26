import { describe, expect, it } from 'vitest';
import { Surface } from './Surface.js';
import type { TeamOrchestrator } from '../team/TeamOrchestrator.js';

describe('Surface', () => {
  it('marks provider failure text as a failed surface', async () => {
    const orchestrator = {
      runAgent: async () => ({
        success: true,
        output: 'API call failed after 3 retries: HTTP 402: Insufficient Balance',
        messages: [],
        toolCalls: [],
        tokenUsage: { input_tokens: 0, output_tokens: 0 },
      }),
    } as unknown as TeamOrchestrator;

    const surface = new Surface({
      id: 'legal-discovery',
      name: 'Legal Discovery',
      agent: 'dev-pm',
      workflow: { goal: 'Produce legal agent team PRD' },
    }, orchestrator);

    const result = await surface.execute();

    expect(result.status).toBe('failed');
    expect(result.error).toContain('Insufficient Balance');
    expect(result.artifacts).toBeUndefined();
  });
});
