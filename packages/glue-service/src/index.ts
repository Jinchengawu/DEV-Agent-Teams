/**
 * GlueService — 胶水层
 *
 * TeamOrchestrator 与 Hermes Profile 之间的桥梁。
 * - 薄胶水（ThinGlue）：单 Agent 任务透传
 * - 厚胶水（ThickGlue）：多 Agent 协作（会议模式）
 * - 生命周期管理：Profile 启动/停止/健康检查/自愈
 */

export { ProfileManager } from './lifecycle/profile-manager.js';
export { ProcessManager } from './lifecycle/process-manager.js';
export { HealthChecker } from './lifecycle/health-checker.js';
export { ThinGlue } from './thin-glue.js';
export { ThickGlue } from './thick-glue.js';
export type {
  ProfileConfig,
  ProfileInfo,
  ProfileStatus,
  TaskRequest,
  TaskResponse,
  MeetingRequest,
  MeetingResponse,
  MeetingComment,
  HealthCheckResult,
  GlueServiceConfig,
} from './types.js';
