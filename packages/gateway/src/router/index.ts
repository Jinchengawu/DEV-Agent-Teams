/**
 * Router — 路由决策和执行
 *
 * 将 /v1/chat/completions 的路由逻辑提取出来：
 * - 模式检测（team/meeting/single）
 * - 路由执行（调用 orchestrator 的相应方法）
 * - 结果格式化
 */

import type { AgentApp } from '@dev-agent/core';
import type { OrchestratorEvent, MeetingProgressEvent } from '@dev-agent/core';

// 从 AgentRunResult 中提取格式化输出
function extractOutput(agentResult: { output: string; toolCalls: { toolName: string }[]; success: boolean }): string {
  const parts: string[] = [];
  if (agentResult.output) parts.push(agentResult.output);
  if (agentResult.toolCalls.length > 0) {
    const toolNames = [...new Set(agentResult.toolCalls.map((tc) => tc.toolName))];
    parts.push(`📊 执行了 ${agentResult.toolCalls.length} 个操作 (${toolNames.join(', ')})`);
  }
  return parts.join('\n') || (agentResult.success ? '✅ 任务完成' : '❌ 任务失败');
}

export interface RouteResult {
  output: string;
  agent: string;
  routedBy: string;
}

export interface RouteContext {
  mode?: string;
  agentId?: string;
  userText: string;
  agentApp: AgentApp;
}

/**
 * 执行路由 — 根据模式选择编排策略
 */
export async function executeRoute(ctx: RouteContext): Promise<RouteResult> {
  const { mode, agentId: requestedAgentId, userText, agentApp } = ctx;

  if (mode === 'team') {
    return await routeTeam(userText, agentApp);
  }

  if (mode === 'meeting') {
    return await routeMeeting(userText, agentApp);
  }

  if (mode === 'single' && requestedAgentId) {
    return await routeSingle(requestedAgentId, userText, agentApp);
  }

  // 默认：智能路由
  return await routeIntent(userText, agentApp);
}

/**
 * Team 模式 — 协调员分解 + 多 Agent 并行执行
 */
async function routeTeam(userText: string, agentApp: AgentApp): Promise<RouteResult> {
  const teamResult = await agentApp.orchestrator.runTeam(userText);

  const parts: string[] = [];
  const coordinatorResult = teamResult.agentResults.get('coordinator');
  if (coordinatorResult) {
    const coordinatorOutput = extractOutput(coordinatorResult);
    if (coordinatorOutput) parts.push(coordinatorOutput);
  }
  for (const [name, agentResult] of teamResult.agentResults) {
    if (name !== 'coordinator') {
      const agentOutput = extractOutput(agentResult);
      if (agentOutput) {
        parts.push(`\n---\n## ${name}\n${agentOutput}`);
      }
    }
  }
  const output = parts.length > 0
    ? parts.join('\n')
    : JSON.stringify({ success: teamResult.success, totalTokenUsage: teamResult.totalTokenUsage });

  return { output, agent: 'team', routedBy: 'team-orchestrator' };
}

/**
 * Meeting 模式 — 圆桌会议，所有 Agent 顺序发言
 */
async function routeMeeting(userText: string, agentApp: AgentApp): Promise<RouteResult> {
  const meetingResult = await agentApp.orchestrator.runMeeting(userText);

  const meetingParts: string[] = [];
  for (const [name, agentResult] of meetingResult.agentResults) {
    const output = extractOutput(agentResult);
    if (output) {
      const agentConf = agentApp.orchestrator.getStatus().teamAgents.find((a: { name: string }) => a.name === name);
      meetingParts.push(`\n---\n## 🧑‍💼 ${name}${agentConf ? `（${agentConf.model}）` : ''}\n${output}`);
    }
  }

  return { output: meetingParts.join('\n') || '会议完成', agent: 'meeting', routedBy: 'meeting-orchestrator' };
}

/**
 * Single 模式 — 指定 Agent 执行
 */
async function routeSingle(agentId: string, userText: string, agentApp: AgentApp): Promise<RouteResult> {
  const agentResult = await agentApp.orchestrator.runAgent(agentId, userText);
  return { output: agentResult.output, agent: agentId, routedBy: 'client-specified' };
}

/**
 * Intent 模式 — 智能路由（LLM-based）
 */
async function routeIntent(userText: string, agentApp: AgentApp): Promise<RouteResult> {
  const teamResult = await agentApp.orchestrator.handleRequest(userText);
  const decision = agentApp.orchestrator.getLastRoutingDecision();

  const parts: string[] = [];
  if (decision) {
    parts.push(`🎯 路由决策: ${decision.strategy} | 复杂度: ${decision.complexity}\n理由: ${decision.reasoning}\n`);
  }

  for (const [name, agentResult] of teamResult.agentResults) {
    const output = extractOutput(agentResult);
    if (output) {
      parts.push(`\n---\n## ${name}\n${output}`);
    }
  }

  const output = parts.join('\n');
  const agentName = decision?.primaryAgent || decision?.involvedAgents?.[0] || 'team';

  return { output, agent: agentName, routedBy: 'intent-router' };
}
