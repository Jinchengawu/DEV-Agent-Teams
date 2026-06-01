import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

const AGENT_IDS = ['dev-frontend', 'dev-backend', 'dev-testing', 'dev-devops', 'dev-pm'];

/**
 * /api/team — 多 Agent 协作端点
 * POST { goal, agents?: string[], mode?: 'parallel' | 'sequential' }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { goal, agents, mode = 'parallel' } = body;

    if (!goal) {
      return NextResponse.json({ error: 'goal is required' }, { status: 400 });
    }

    const targets = (agents && Array.isArray(agents) && agents.length > 0)
      ? agents.filter((a: string) => AGENT_IDS.includes(a))
      : AGENT_IDS;

    if (mode === 'sequential') {
      // 顺序模式 — 依次通过 Gateway 发送到各 Agent
      const results = [];
      for (const agentId of targets) {
        try {
          const controller = new AbortController();
          const t = setTimeout(() => controller.abort(), 300000);
          const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: `[${agentId}] ${goal}` }],
              sessionId: `team-seq-${Date.now()}-${agentId}`,
            }),
            signal: controller.signal,
          });
          clearTimeout(t);
          const data = await res.json();
          results.push({
            agent: agentId,
            content: data.choices?.[0]?.message?.content || 'No response',
          });
        } catch (e) {
          results.push({ agent: agentId, content: `Error: ${e instanceof Error ? e.message : 'unknown'}` });
        }
      }
      return NextResponse.json({ goal, mode: 'sequential', responses: results, timestamp: Date.now() });
    }

    // Parallel mode — 所有 Agent 并发（通过 Gateway 路由）
    const results = await Promise.allSettled(
      targets.map(async (agentId: string) => {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 300000);
        try {
          const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: `[${agentId}] ${goal}` }],
              sessionId: `team-${Date.now()}-${agentId}`,
            }),
            signal: controller.signal,
          });
          clearTimeout(t);
          const data = await res.json();
          return {
            agent: agentId,
            content: data.choices?.[0]?.message?.content || 'No response',
          };
        } catch (e) {
          clearTimeout(t);
          return { agent: agentId, content: `Error: ${e instanceof Error ? e.message : 'unknown'}` };
        }
      })
    );

    return NextResponse.json({
      goal,
      mode: 'parallel',
      responses: results.map((r) =>
        r.status === 'fulfilled' ? r.value : { agent: 'unknown', content: `Error: ${r.reason}` }
      ),
      timestamp: Date.now(),
    });
  } catch (e) {
    return NextResponse.json(
      { error: `Team failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
