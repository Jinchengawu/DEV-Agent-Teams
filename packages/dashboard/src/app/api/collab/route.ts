import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

const AGENT_IDS = ['dev-frontend', 'dev-backend', 'dev-testing', 'dev-devops', 'dev-pm'];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, agents } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    // 默认全部 Agent
    const targets = (agents as string[]) || AGENT_IDS;
    const validTargets = targets.filter((a) => AGENT_IDS.includes(a));

    if (validTargets.length === 0) {
      return NextResponse.json({ error: 'No valid agents specified' }, { status: 400 });
    }

    // 并发发送到多个 Agent（通过 Gateway 路由）
    const results = await Promise.allSettled(
      validTargets.map(async (agentId) => {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 300000);

        try {
          const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: message }],
              sessionId: `collab-${Date.now()}-${agentId}`,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeout);
          const data = await res.json();
          return {
            agent: agentId,
            role: 'assistant' as const,
            content: data.choices?.[0]?.message?.content || 'No response',
          };
        } catch (e) {
          clearTimeout(timeout);
          return {
            agent: agentId,
            role: 'system' as const,
            content: `Error: ${e instanceof Error ? e.message : 'unknown'}`,
          };
        }
      })
    );

    const responses = results.map((r) =>
      r.status === 'fulfilled' ? r.value : { agent: 'unknown', role: 'system' as const, content: `Error: ${r.reason}` }
    );

    return NextResponse.json({ message, responses, timestamp: Date.now() });
  } catch (e) {
    return NextResponse.json(
      { error: `Collaboration failed: ${e instanceof Error ? e.message : 'unknown'}` },
      { status: 500 }
    );
  }
}
