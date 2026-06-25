import { NextResponse } from 'next/server';

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://127.0.0.1:8400';

interface HealthResult {
  id: string;
  online: boolean;
  data?: {
    status: string;
    agent: string;
    label: string;
    hermesPort: number;
    skills: number;
  };
  error?: string;
}

async function checkGateway(): Promise<{ online: boolean; agents: HealthResult[]; livePipelineReady: boolean }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${GATEWAY_URL}/agent-health`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const agents: HealthResult[] = (data.agents || []).map((a: {
      id: string;
      name?: string;
      label?: string;
      online: boolean;
      hermesPort?: number;
      skills?: number;
      error?: string;
    }) => ({
      id: a.id || a.name || '',
      online: Boolean(a.online),
      data: {
        status: a.online ? 'online' : 'offline',
        agent: a.id || a.name || '',
        label: a.label || a.id || a.name || '',
        hermesPort: a.hermesPort || 0,
        skills: a.skills || 0,
      },
      error: a.error,
    }));
    return { online: true, agents, livePipelineReady: Boolean(data.livePipelineReady) };
  } catch (e) {
    return {
      online: false,
      livePipelineReady: false,
      agents: ['dev-frontend', 'dev-backend', 'dev-testing', 'dev-devops', 'dev-pm', 'project-admin'].map(id => ({
        id,
        online: false,
        error: e instanceof Error ? e.message : 'Gateway offline',
      })),
    };
  }
}

export async function GET() {
  const { online, agents, livePipelineReady } = await checkGateway();
  const onlineCount = agents.filter((agent) => agent.online).length;

  return NextResponse.json({
    timestamp: Date.now(),
    gatewayOnline: online,
    livePipelineReady,
    onlineCount,
    totalAgents: agents.length,
    totalSkills: agents.reduce((sum, agent) => sum + (agent.data?.skills || 0), 0),
    agents,
  });
}
