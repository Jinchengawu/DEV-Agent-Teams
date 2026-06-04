import { NextRequest, NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

/**
 * /api/collab — 多 Agent 协作端点（Broadcast 模式）
 * POST { message, agents?: string[] }
 *
 * 使用 Gateway 的 TeamOrchestrator 编排：
 * 协调员分析目标 → 拆解任务 DAG → 分配给合适的 Agent → 汇总结果
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, mode: bodyMode } = body;

    if (!message) {
      return NextResponse.json({ error: 'message is required' }, { status: 400 });
    }

    const mode = bodyMode || 'team'; // 支持 'team' 和 'meeting' 模式

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600000); // 10 分钟超时

    const res = await fetch(`${GATEWAY_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        mode,
        sessionId: `collab-${Date.now()}`,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      return NextResponse.json(
        { error: `Gateway returned ${res.status}: ${errBody}` },
        { status: res.status },
      );
    }

    const data = await res.json();

    return NextResponse.json({
      message,
      mode,
      content: data.choices?.[0]?.message?.content || 'No response',
      agent: data.instance || mode,
      routedBy: data.routedBy || `${mode}-orchestrator`,
      sessionId: data.sessionId,
      timestamp: Date.now(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    if (message.includes('abort')) {
      return NextResponse.json({ error: 'Collaboration timed out' }, { status: 504 });
    }
    return NextResponse.json(
      { error: `Collaboration failed: ${message}` },
      { status: 503 },
    );
  }
}
