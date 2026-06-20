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

async function checkGateway(): Promise<{ online: boolean; agents: HealthResult[] }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${GATEWAY_URL}/agents`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const agents: HealthResult[] = (data.agents || []).map((a: { name: string }) => ({
      id: a.name,
      online: true,
    }));
    return { online: true, agents };
  } catch (e) {
    return {
      online: false,
      agents: ['dev-frontend', 'dev-backend', 'dev-testing', 'dev-devops', 'dev-pm'].map(id => ({
        id,
        online: false,
        error: e instanceof Error ? e.message : 'Gateway offline',
      })),
    };
  }
}

export async function GET() {
  const { online, agents } = await checkGateway();

  return NextResponse.json({
    timestamp: Date.now(),
    onlineCount: online ? agents.length : 0,
    totalAgents: agents.length,
    totalSkills: 0,
    agents,
  });
}
