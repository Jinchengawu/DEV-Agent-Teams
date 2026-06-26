// @dev-agent/core — 基于 Hermes Agent 集群的多 Agent 协作编排平台

// ── Hermes Agent 客户端（新增 — 替代 omAgent）──
export {
  HermesAgentClient,
  createHermesAgentClient,
  getGlobalHermesClient,
} from './hermes/index.js';
export type {
  HermesInstance,
  HermesConfig,
  HermesAgentResult,
} from './hermes/index.js';

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

// ── 模型消耗保护（Codex 回填模式）──
export {
  createGuardedAgentResult,
  createGuardedRoutingDecision,
  isModelSpendGuardEnabled,
  modelSpendGuardMessage,
} from './runtime/model-spend-guard.js';

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
  ConflictResolver,
  createConflictResolver,
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
  ConflictResolution,
  ConflictStrategy,
  Conflict,
  ConflictConfig,
} from './pipeline';

// ── 内置生命周期模板 ──
export { DEV_TEAM_MINIMUM_LOOP_PIPELINE } from './lifecycle/dev-team-minimum-loop.js';

// ── 知识中心（新增 — P1）──
export {
  KnowledgeCenter,
  getGlobalKnowledgeCenter,
  resetGlobalKnowledgeCenter,
  createKnowledgeCenter,
} from './knowledge/KnowledgeCenter.js';
export type {
  KnowledgeDocument,
  KnowledgeQuery,
  KnowledgeResult,
  KnowledgeCenterConfig,
} from './knowledge/KnowledgeCenter.js';

// ── 增强文档管理（新增 — 支持项目/任务/Agent关联、评论、版本）──
export {
  DocumentManager,
  createDocumentManager,
  getGlobalDocumentManager,
  resetGlobalDocumentManager,
} from './knowledge/DocumentManager.js';
export type {
  DocumentV2,
  DocumentComment,
  DocumentQuery,
  Project,
  Task,
  DocumentManagerConfig,
} from './knowledge/DocumentManager.js';
export { MessageBus, getGlobalMessageBus, resetGlobalMessageBus } from './event/MessageBus';
export type { AgentMessage, MessageBusOptions } from './event/MessageBus';

// ── Token 预算管理（新增 — Phase 5: 成本控制）──
export { TokenBudgetManager, getGlobalTokenBudgetManager, resetGlobalTokenBudgetManager } from './telemetry/TokenBudgetManager';
export type { TokenBudget, BudgetCheckResult } from './telemetry/TokenBudgetManager';

// ── 认证系统（新增）──
export { AuthService } from './auth/AuthService';
export { createAuthRoutes } from './auth/routes';
export { createAuthMiddleware } from './auth/middleware';
export type { User, AuthTokens, RegisterInput, LoginInput } from './auth/AuthService';
export { AppError } from './auth/AuthService';

// ── 国际化（新增 — 全栈中英展示协商）──
export {
  normalizeLocale,
  negotiateLocale,
  isSupportedLocale,
  pickText,
  localizeAgent,
  localizeAgents,
} from './i18n/index.js';
export type { Locale, LocalizedText } from './i18n/index.js';

// ── 股票分析子系统（新增）──
export { StockRepository } from './stock/StockRepository.js';
export type { StockCacheEntry } from './stock/StockRepository.js';
export { createStockRoutes } from './stock/routes.js';
export { ValuationService } from './valuation/ValuationService.js';
export type { DCFAssumptions, DCFResult, DCFModel } from './valuation/ValuationService.js';
export { createValuationRoutes } from './valuation/routes.js';
export { WatchlistService } from './watchlist/WatchlistService.js';
export { createWatchlistRoutes } from './watchlist/routes.js';
export { ScreenerService } from './screener/ScreenerService.js';
export type { FilterRule, FilterCondition, ScreenerQuery } from './screener/ScreenerService.js';
export { createScreenerRoutes } from './screener/routes.js';

// ── HTTP API 层 ──
export { createAgentApp } from './agent-factory';
export type { AgentAppConfig, AgentApp } from './agent-factory';

// ── 重新导出 Open-Agent-Teams 框架核心（血缘关系）──
export * from '@open-agent-teams/core';
