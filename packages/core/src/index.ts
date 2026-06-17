// @dev-agent/core — 基于 @open-multi-agent/core 的多 Agent 协作框架

// ── 会话管理（保留，框架不覆盖）──
export { SessionManager } from './session/SessionManager';
export { initSchema } from './session/schema';

// ── 编排器（核心）──
export { TeamOrchestrator, createTeamOrchestrator, createDevTeamOrchestrator } from './team/TeamOrchestrator';

// ── 编排器抽象层（解耦 @open-multi-agent/core）──
export type { IOrchestrator } from './orchestrator/IOrchestrator';
export type {
  TeamAgentConfig,
  TeamOrchestratorConfig,
  MeetingProgressEvent,
  OrchestratorEvent,
  AgentRunResult,
  TeamRunResult,
  TaskDefinition,
  OrchestratorStatus,
  TokenUsage,
} from './orchestrator/types';

// ── HTTP API 层 ──
export { createAgentApp } from './agent-factory';
export type { AgentAppConfig, AgentApp } from './agent-factory';
