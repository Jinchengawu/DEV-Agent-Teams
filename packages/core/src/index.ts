// @dev-agent/core — 基于 Hermes Agent 集群的多 Agent 协作编排平台

// ── Hermes Agent 客户端（新增 — 替代 omAgent）──
export {
  HermesAgentClient,
  createHermesAgentClient,
  getGlobalHermesClient,
} from './hermes';
export type {
  HermesInstance,
  HermesConfig,
  HermesAgentResult,
} from './hermes';

// ── 会话管理 ──
export { SessionManager } from './session/SessionManager';
export { initSchema } from './session/schema';
export { WorkflowStateManager } from './session/WorkflowStateManager';
export type { WorkflowState, WorkflowStepState, WorkflowContext } from './session/WorkflowStateManager';

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
  RoutingDecision,
  IntentRouterConfig,
} from './orchestrator/types';

// ── 意图路由（新增）──
export { IntentRouter } from './intent/IntentRouter';

// ── 事件总线（新增 — Phase 1: 打通孤岛）──
export { EventBus, eventBus } from './event/EventBus';
export type { AnyEvent } from './event/EventBus';
export type {
  KanbanEvent,
  WorkflowEvent,
  MeetingEvent,
  SystemEvent,
  ActionItem,
  TaskStatus,
  EventHandler,
} from './event/types';
export {
  registerAllHandlers,
  registerKanbanHandlers,
  registerWorkflowHandlers,
  registerMeetingHandlers,
} from './event/handlers';
export type {
  AllHandlerDeps,
  KanbanHandlerDeps,
  WorkflowHandlerDeps,
  MeetingHandlerDeps,
} from './event/handlers';

// ── Pipeline 引擎（新增 — 面编排）──
export {
  Surface,
  createSurface,
  PipelineOrchestrator,
  createPipelineOrchestrator,
} from './pipeline';
export type {
  PipelineDefinition,
  PipelineInstance,
  PipelineStatus,
  SurfaceDefinition,
  SurfaceResult,
  SurfaceStatus,
  InputContract,
  OutputContract,
  Edge,
  GateDefinition,
} from './pipeline';
export { MessageBus, getGlobalMessageBus, resetGlobalMessageBus } from './event/MessageBus';
export type { AgentMessage, MessageBusOptions } from './event/MessageBus';

// ── Token 预算管理（新增 — Phase 5: 成本控制）──
export { TokenBudgetManager, getGlobalTokenBudgetManager, resetGlobalTokenBudgetManager } from './telemetry/TokenBudgetManager';
export type { TokenBudget, BudgetCheckResult } from './telemetry/TokenBudgetManager';

// ── HTTP API 层 ──
export { createAgentApp } from './agent-factory';
export type { AgentAppConfig, AgentApp } from './agent-factory';

// ── 重新导出 Open-Agent-Teams 框架核心（血缘关系）──
export * from '@open-agent-teams/core';
