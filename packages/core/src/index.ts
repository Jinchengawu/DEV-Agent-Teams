// @dev-agent/core — 基于 @open-multi-agent/core 的多 Agent 协作框架

// ── 会话管理（保留，框架不覆盖）──
export { SessionManager } from './session/SessionManager';
export { initSchema } from './session/schema';

// ── 编排器（核心）──
export { TeamOrchestrator, createTeamOrchestrator, createDevTeamOrchestrator } from './team/TeamOrchestrator';
export type { TeamAgentConfig, TeamOrchestratorConfig, MeetingProgressEvent } from './team/TeamOrchestrator';

// ── 框架类型（透传）──
export type { OrchestratorEvent } from '@open-multi-agent/core';

// ── HTTP API 层 ──
export { createAgentApp } from './agent-factory';
export type { AgentAppConfig, AgentApp } from './agent-factory';
