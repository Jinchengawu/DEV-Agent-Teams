/**
 * TeamOrchestrator — 基于 @open-multi-agent/core 的多 Agent 协作编排器
 *
 * 核心能力：
 * - runTeam(): 自动拆解目标 → DAG 并行执行 → 结果汇总
 * - runAgent(): 单 Agent 执行简单任务
 * - runTasks(): 显式任务列表（用户指定具体步骤时）
 * - SharedMemory: 团队共享上下文
 * - MessageBus: Agent 间消息传递
 * - delegate_to_agent: 内置工具（带循环检测 + 深度限制）
 */

import {
  OpenMultiAgent,
  type AgentConfig,
  type TeamConfig,
  type TeamRunResult,
  type AgentRunResult,
  type OrchestratorConfig,
  type RunTeamOptions,
  type OrchestratorEvent,
} from '@open-multi-agent/core';
import { createSendMessageTool } from '../tools/send-message.js';
import { registerTeam } from '../tools/team-registry.js';

// ============================================================================
// Config
// ============================================================================

export interface TeamAgentConfig {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  model: string;
  apiKey: string;
  baseUrl: string;
}

export interface TeamOrchestratorConfig {
  agents: TeamAgentConfig[];
  defaultModel: string;
  apiKey: string;
  baseUrl: string;
  maxConcurrency?: number;
  maxDelegationDepth?: number;
  onProgress?: (event: OrchestratorEvent) => void;
}

// ============================================================================
// Orchestrator
// ============================================================================

export class TeamOrchestrator {
  private omAgent: OpenMultiAgent;
  private team: Awaited<ReturnType<OpenMultiAgent['createTeam']>>;
  private agentConfigs: Map<string, TeamAgentConfig>;

  constructor(config: TeamOrchestratorConfig) {
    this.agentConfigs = new Map();
    for (const a of config.agents) {
      this.agentConfigs.set(a.id, a);
    }

    // 初始化 OpenMultiAgent — 使用 mimo provider 避免 404
    const orchestratorConfig: OrchestratorConfig = {
      defaultModel: config.defaultModel,
      defaultProvider: 'mimo',
      defaultBaseURL: config.baseUrl,
      defaultApiKey: config.apiKey,
      maxConcurrency: config.maxConcurrency ?? 5,
      maxDelegationDepth: config.maxDelegationDepth ?? 3,
      onProgress: config.onProgress,
    };

    this.omAgent = new OpenMultiAgent(orchestratorConfig);

    // 创建 send_message 自定义工具（通过 teamId 引用，execute 时才查找 Team 实例）
    const teamId = 'dev-agent-team';
    const sendMessageTool = createSendMessageTool(teamId);

    // 创建团队 — 每个 DEV Agent 映射为一个 open-multi-agent Agent
    const teamAgents: AgentConfig[] = config.agents.map((a) => ({
      name: a.id,
      model: config.defaultModel,
      provider: 'mimo' as const,
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      systemPrompt: a.systemPrompt,
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob', 'send_message'],
      customTools: [sendMessageTool],
    }));

    const teamConfig: TeamConfig = {
      name: 'DEV-Agent-Team',
      agents: teamAgents,
      sharedMemory: true,
    };

    this.team = this.omAgent.createTeam(teamId, teamConfig);

    // 注册 Team 到全局注册表，供 send_message 工具在 execute 时查找
    registerTeam(teamId, this.team);

    console.log(`[TeamOrchestrator] 团队已创建: ${teamAgents.length} 成员, sharedMemory=true`);
  }

  /**
   * runTeam — 自动编排多 Agent 协作
   * 协调员分析目标 → 拆解为任务 DAG → 并行执行无依赖任务 → 汇总结果
   */
  async runTeam(goal: string, options?: RunTeamOptions): Promise<TeamRunResult> {
    console.log(`[TeamOrchestrator] runTeam: "${goal.substring(0, 60)}..."`);
    return this.omAgent.runTeam(this.team, goal, options);
  }

  /**
   * runAgent — 单 Agent 执行
   * 用于简单任务，不需要多 Agent 协作
   */
  async runAgent(agentId: string, goal: string): Promise<AgentRunResult> {
    const config = this.agentConfigs.get(agentId);
    if (!config) throw new Error(`Agent "${agentId}" not found`);

    console.log(`[TeamOrchestrator] runAgent: ${agentId} → "${goal.substring(0, 60)}..."`);

    return this.omAgent.runAgent(
      {
        name: config.id,
        model: config.model,
        provider: 'mimo' as const,
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
        systemPrompt: config.systemPrompt,
        tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob', 'send_message'],
        customTools: [createSendMessageTool('dev-agent-team')],
      },
      goal,
    );
  }

  /**
   * runTasks — 显式任务列表
   * 当用户指定具体步骤时使用，不经过协调员分解
   */
  async runTasks(
    tasks: Array<{
      title: string;
      description: string;
      assignee?: string;
      dependsOn?: string[];
    }>,
  ): Promise<TeamRunResult> {
    console.log(`[TeamOrchestrator] runTasks: ${tasks.length} 个任务`);
    return this.omAgent.runTasks(this.team, tasks);
  }

  /**
   * 获取 Agent 间消息历史
   */
  getMessages(agentName?: string) {
    if (agentName) {
      return this.team.getMessages(agentName);
    }
    return this.team.getAgents().flatMap((a) => this.team.getMessages(a.name));
  }

  /**
   * 广播消息给所有 Agent
   */
  broadcast(from: string, content: string) {
    this.team.broadcast(from, content);
  }

  /**
   * 获取团队状态
   */
  getStatus() {
    return {
      teamAgents: this.team.getAgents().map((a) => ({
        name: a.name,
        model: a.model || 'default',
      })),
      sharedMemory: !!this.team.config?.sharedMemory,
      orchestrator: this.omAgent.getStatus(),
    };
  }

  /**
   * 获取 OpenMultiAgent 实例（高级用法）
   */
  getOrchestrator() {
    return this.omAgent;
  }

  /**
   * 获取 Team 实例（高级用法）
   */
  getTeam() {
    return this.team;
  }

  /**
   * 关闭编排器
   */
  async shutdown() {
    await this.omAgent.shutdown();
    console.log('[TeamOrchestrator] 已关闭');
  }
}

// ============================================================================
// 便捷工厂
// ============================================================================

/**
 * 用 DEV-Agent-Teams 的 Agent 配置创建编排器
 */
export function createTeamOrchestrator(
  agents: TeamAgentConfig[],
  model?: string,
  options?: { onProgress?: (event: OrchestratorEvent) => void },
): TeamOrchestrator {
  return new TeamOrchestrator({
    agents,
    defaultModel: model || process.env.MODEL_NAME || 'mimo-v2.5-pro',
    apiKey: process.env.API_KEY || '',
    baseUrl: process.env.MODEL_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
    onProgress: options?.onProgress,
  });
}

/**
 * 从环境变量创建 DEV-Agent-Teams 标准团队
 */
export function createDevTeamOrchestrator(options?: {
  onProgress?: (event: OrchestratorEvent) => void;
}): TeamOrchestrator {
  const model = process.env.MODEL_NAME || 'mimo-v2.5-pro';
  const apiKey = process.env.API_KEY || '';
  const baseUrl = process.env.MODEL_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';

  const commGuide = '\n\n团队通信：你可以使用 send_message 工具与其他 Agent 对话。\n- send_message({ to: "dev-backend", content: "..." }) — 发送给指定 Agent\n- send_message({ to: "*", content: "..." }) — 广播给所有 Agent\n可用的团队成员: dev-frontend, dev-backend, dev-testing, dev-devops, dev-pm\n收到其他 Agent 的消息时，直接用 send_message 回复，不需要搜索文件系统。';

  const agents: TeamAgentConfig[] = [
    {
      id: 'dev-frontend',
      name: 'Frontend Agent',
      role: '前端开发专家 — React/Vue/TypeScript/CSS/Tailwind',
      systemPrompt: '你是前端开发专家，专注于 React、Vue、TypeScript、CSS、Tailwind。收到任务后给出具体可运行的代码方案。' + commGuide,
      model, apiKey, baseUrl,
    },
    {
      id: 'dev-backend',
      name: 'Backend Agent',
      role: '后端开发专家 — Python/Node.js/Go/API/数据库',
      systemPrompt: '你是后端开发专家，专注于 Python、Node.js、Go、API 设计、数据库。收到任务后给出具体可运行的代码方案。' + commGuide,
      model, apiKey, baseUrl,
    },
    {
      id: 'dev-testing',
      name: 'Testing Agent',
      role: '测试专家 — pytest/Jest/Playwright/覆盖率',
      systemPrompt: '你是测试专家，专注于 pytest、Jest、Playwright、覆盖率。收到任务后给出具体的测试方案和用例。' + commGuide,
      model, apiKey, baseUrl,
    },
    {
      id: 'dev-devops',
      name: 'DevOps Agent',
      role: '运维专家 — Docker/K8s/CI-CD/部署',
      systemPrompt: '你是 DevOps 专家，专注于 Docker、K8s、CI/CD、部署。收到任务后给出具体的部署方案。' + commGuide,
      model, apiKey, baseUrl,
    },
    {
      id: 'dev-pm',
      name: 'PM Agent',
      role: '产品经理 — PRD/需求分析/用户故事/产品策略',
      systemPrompt: '你是产品经理，专注于 PRD、需求分析、用户故事、产品策略。收到任务后给出结构化的产品文档。' + commGuide,
      model, apiKey, baseUrl,
    },
  ];

  return new TeamOrchestrator({ agents, defaultModel: model, apiKey, baseUrl, onProgress: options?.onProgress });
}
