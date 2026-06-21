/**
 * TeamOrchestrator — 基于 @open-multi-agent/core 的多 Agent 协作编排器
 *
 * 实现 IOrchestrator 接口，对外不暴露 @open-multi-agent/core 的类型。
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
  type AgentConfig as OmaAgentConfig,
  type TeamConfig as OmaTeamConfig,
  type TeamRunResult as OmaTeamRunResult,
  type AgentRunResult as OmaAgentRunResult,
  type OrchestratorConfig as OmaOrchestratorConfig,
  type RunTeamOptions as OmaRunTeamOptions,
  type OrchestratorEvent as OmaOrchestratorEvent,
  type TokenUsage as OmaTokenUsage,
} from '@open-multi-agent/core';
import { createSendMessageTool } from '../tools/send-message.js';
import { registerTeam } from '../tools/team-registry.js';
import { IntentRouter } from '../intent/IntentRouter.js';
import { eventBus } from '../event/EventBus.js';
import { getGlobalMessageBus } from '../event/MessageBus.js';
import type { IOrchestrator } from '../orchestrator/IOrchestrator.js';
import type {
  TeamAgentConfig,
  TeamOrchestratorConfig,
  TeamRunResult,
  AgentRunResult,
  TaskDefinition,
  OrchestratorStatus,
  MeetingProgressEvent,
  OrchestratorEvent,
  TokenUsage,
  RoutingDecision,
} from '../orchestrator/types.js';

// Re-export types for backward compatibility
export type { TeamAgentConfig, TeamOrchestratorConfig, MeetingProgressEvent, OrchestratorEvent } from '../orchestrator/types.js';

// ============================================================================
// Orchestrator
// ============================================================================

export class TeamOrchestrator implements IOrchestrator {
  private omAgent: OpenMultiAgent;
  private team: Awaited<ReturnType<OpenMultiAgent['createTeam']>>;
  private agentConfigs: Map<string, TeamAgentConfig>;
  private intentRouter: IntentRouter;
  private lastRoutingDecision: RoutingDecision | null = null;
  private workflowStateManager?: import('../session/WorkflowStateManager.js').WorkflowStateManager;
  private tokenBudgetManager?: import('../telemetry/TokenBudgetManager.js').TokenBudgetManager;

  constructor(config: TeamOrchestratorConfig) {
    this.agentConfigs = new Map();
    for (const a of config.agents) {
      this.agentConfigs.set(a.id, a);
    }

    this.workflowStateManager = config.workflowStateManager;
    this.tokenBudgetManager = config.tokenBudgetManager;

    // 初始化 IntentRouter
    this.intentRouter = new IntentRouter(
      {
        model: config.defaultModel,
        baseURL: config.baseUrl,
        apiKey: config.apiKey,
      },
      config.agents,
    );

    // 初始化 MessageBus
    const messageBus = getGlobalMessageBus({ verbose: true });

    // 注册所有 Agent 到 MessageBus
    for (const agent of config.agents) {
      messageBus.registerAgent(agent.id, async (msg) => {
        console.log(`[MessageBus] ${msg.from} → ${msg.to}: ${msg.content.substring(0, 50)}...`);
      });
    }

    console.log(`[TeamOrchestrator] 已注册 ${config.agents.length} 个 Agent 到 MessageBus`);

    // 初始化 OpenMultiAgent — 使用 mimo provider 避免 404
    const orchestratorConfig: OmaOrchestratorConfig = {
      defaultModel: config.defaultModel,
      defaultProvider: 'mimo',
      defaultBaseURL: config.baseUrl,
      defaultApiKey: config.apiKey,
      maxConcurrency: config.maxConcurrency ?? 5,
      maxDelegationDepth: config.maxDelegationDepth ?? 3,
      onProgress: config.onProgress as ((event: OmaOrchestratorEvent) => void) | undefined,
    };

    this.omAgent = new OpenMultiAgent(orchestratorConfig);

    // 创建 send_message 自定义工具（通过 teamId 引用，execute 时才查找 Team 实例）
    const teamId = 'dev-agent-team';
    const sendMessageTool = createSendMessageTool(teamId);

    // 创建团队 — 每个 DEV Agent 映射为一个 open-multi-agent Agent
    const teamAgents: OmaAgentConfig[] = config.agents.map((a) => ({
      name: a.id,
      model: config.defaultModel,
      provider: 'mimo' as const,
      baseURL: config.baseUrl,
      apiKey: config.apiKey,
      systemPrompt: a.systemPrompt,
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob', 'send_message'],
      customTools: [sendMessageTool],
    }));

    const teamConfig: OmaTeamConfig = {
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
  async runTeam(goal: string, options?: { maxRounds?: number }): Promise<TeamRunResult> {
    console.log(`[TeamOrchestrator] runTeam: "${goal.substring(0, 60)}..."`);
    const workflowId = `team-${Date.now()}`;
    
    // 创建持久化状态（如果提供了 WorkflowStateManager）
    const stateManager = this.workflowStateManager;
    let wfState = stateManager ? stateManager.createState(goal, 1) : null;
    
    // 发布工作流开始事件
    eventBus.emit({
      type: 'workflow.started',
      source: 'workflow',
      timestamp: Date.now(),
      payload: { workflowId: wfState?.id || workflowId, taskId: goal.substring(0, 50) },
    });

    try {
      const result = await this.omAgent.runTeam(this.team, goal, options as OmaRunTeamOptions);
      const teamResult = result as unknown as TeamRunResult;
      
      // 跟踪 Token 使用
      this.trackTokenUsage('runTeam', teamResult.totalTokenUsage || { input_tokens: 0, output_tokens: 0 });
      
      // 标记工作流完成
      if (stateManager && wfState) {
        stateManager.complete(wfState.id, teamResult.output);
      }
      
      // 发布工作流完成事件
      eventBus.emit({
        type: 'workflow.completed',
        source: 'workflow',
        timestamp: Date.now(),
        payload: {
          workflowId: wfState?.id || workflowId,
          taskId: goal.substring(0, 50),
          output: teamResult.output?.substring(0, 200),
          tokenUsage: teamResult.totalTokenUsage,
        },
      });
      
      return teamResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      
      // 标记工作流失败
      if (stateManager && wfState) {
        stateManager.fail(wfState.id, errorMsg);
      }
      
      // 发布工作流失败事件
      eventBus.emit({
        type: 'workflow.failed',
        source: 'workflow',
        timestamp: Date.now(),
        payload: {
          workflowId: wfState?.id || workflowId,
          taskId: goal.substring(0, 50),
          error: errorMsg,
        },
      });
      
      throw error;
    }
  }

  /**
   * resumeWorkflow — 从断点续传工作流
   * 加载已保存的工作流状态，继续执行未完成的步骤
   */
  async resumeWorkflow(workflowId: string): Promise<TeamRunResult> {
    const stateManager = this.workflowStateManager;
    if (!stateManager) {
      throw new Error('WorkflowStateManager 未配置，无法断点续传');
    }

    const state = stateManager.load(workflowId);
    if (!state) {
      throw new Error(`工作流 ${workflowId} 不存在`);
    }

    if (state.status === 'completed') {
      return {
        success: true,
        goal: state.goal,
        agentResults: new Map(),
        totalTokenUsage: state.tokenUsage,
      };
    }

    console.log(`[TeamOrchestrator] resumeWorkflow: ${workflowId} (step ${state.currentStep}/${state.totalSteps})`);

    try {
      const result = await this.omAgent.runTeam(this.team, state.goal);
      const teamResult = result as unknown as TeamRunResult;
      
      stateManager.complete(workflowId, teamResult.output);
      
      return teamResult;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      stateManager.fail(workflowId, errorMsg);
      throw error;
    }
  }

  /**
   * listWorkflows — 列出所有工作流状态
   */
  listWorkflows(limit?: number, offset?: number) {
    return this.workflowStateManager?.listWorkflows(limit, offset) || [];
  }

  /**
   * getRunningWorkflows — 获取正在运行的工作流
   */
  getRunningWorkflows() {
    return this.workflowStateManager?.getRunningWorkflows() || [];
  }

  /**
   * checkBudget — Token 预算检查
   * 在 LLM 调用前检查预算是否充足
   */
  private checkBudget(sessionId: string, estimatedTokens: number = 5000): void {
    const manager = this.tokenBudgetManager;
    if (!manager) return;

    const result = manager.checkBudget(sessionId, estimatedTokens);
    if (!result.allowed) {
      throw new Error(`Token预算已耗尽: ${result.message}`);
    }
    if (result.status === 'warning') {
      console.warn(`[TokenBudget] ${result.message}`);
      // 触发告警事件
      eventBus.emit({
        type: 'system.token_alert',
        source: 'system',
        timestamp: Date.now(),
        payload: {
          sessionId,
          message: result.message,
          severity: 'warning',
        },
      });
    }
  }

  /**
   * trackTokenUsage — 记录 Token 使用
   */
  private trackTokenUsage(sessionId: string, tokenUsage: { input_tokens: number; output_tokens: number }): void {
    const manager = this.tokenBudgetManager;
    if (!manager) return;
    manager.trackUsage(sessionId, tokenUsage.input_tokens + tokenUsage.output_tokens);
  }

  /**
   * runAgent — 单 Agent 执行
   * 用于简单任务，不需要多 Agent 协作
   */
  async runAgent(agentId: string, goal: string): Promise<AgentRunResult> {
    const config = this.agentConfigs.get(agentId);
    if (!config) throw new Error(`Agent "${agentId}" not found`);

    console.log(`[TeamOrchestrator] runAgent: ${agentId} → "${goal.substring(0, 60)}..."`);

    // 检查预算
    this.checkBudget(agentId, 5000);

    const result = await this.omAgent.runAgent(
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

    // 跟踪 Token 使用
    this.trackTokenUsage(agentId, (result as any).tokenUsage || { input_tokens: 0, output_tokens: 0 });

    return result as unknown as AgentRunResult;
  }

  /**
   * runTasks — 显式任务列表
   * 当用户指定具体步骤时使用，不经过协调员分解
   */
  async runTasks(tasks: TaskDefinition[]): Promise<TeamRunResult> {
    console.log(`[TeamOrchestrator] runTasks: ${tasks.length} 个任务`);
    const result = await this.omAgent.runTasks(
      this.team,
      tasks as unknown as Parameters<typeof this.omAgent.runTasks>[1],
    );
    return result as unknown as TeamRunResult;
  }

  /**
   * runMeeting — 圆桌会议模式
   * 所有 Agent 顺序执行，共享上下文，每人从自己的专业角度发表意见
   */
  async runMeeting(goal: string): Promise<TeamRunResult> {
    console.log(`[TeamOrchestrator] runMeeting: "${goal.substring(0, 60)}..."`);
    
    // 检查预算（估算：每个 Agent 约 3000 token）
    const agentCount = this.team.getAgents().length;
    this.checkBudget('runMeeting', agentCount * 3000);

    const agents = this.team.getAgents();
    const agentResults = new Map<string, AgentRunResult>();
    const discussion: string[] = [];
    const totalTokenUsage = { input_tokens: 0, output_tokens: 0 };

    for (const agent of agents) {
      const config = this.agentConfigs.get(agent.name);
      if (!config) continue;

      // 构建带上下文的 prompt：原始目标 + 之前所有 Agent 的发言
      const contextSection = discussion.length > 0
        ? `\n\n## 会议讨论记录（之前的发言）\n${discussion.join('\n\n')}`
        : '';
      const prompt = `## 会议议题\n${goal}${contextSection}\n\n请从你的专业角度（${config.role}）发表意见。简洁有力，突出重点。`;

      const result = await this.omAgent.runAgent(
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
        prompt,
      );

      const typedResult = result as unknown as AgentRunResult;
      agentResults.set(agent.name, typedResult);

      // 累积上下文和 token 用量
      discussion.push(`### ${config.name}（${config.role}）\n${typedResult.output}`);
      totalTokenUsage.input_tokens += typedResult.tokenUsage.input_tokens;
      totalTokenUsage.output_tokens += typedResult.tokenUsage.output_tokens;

      console.log(`[TeamOrchestrator] meeting: ${config.id} 已发言`);
    }

    const meetingResult: TeamRunResult = {
      success: true,
      goal,
      agentResults,
      totalTokenUsage: totalTokenUsage as TokenUsage,
    };

    // 发布会议完成事件
    eventBus.emit({
      type: 'meeting.completed',
      source: 'meeting',
      timestamp: Date.now(),
      payload: {
        meetingId: `meeting-${Date.now()}`,
        topic: goal.substring(0, 100),
        participants: this.team.getAgents().map((a) => a.name),
        summary: discussion.join('\n\n').substring(0, 500),
        actionItems: [], // 可以由 LLM 解析生成
      },
    });

    return meetingResult;
  }

  /**
   * runMeetingWithProgress — 带实时进度的圆桌会议（并发控制 + 重试）
   * 最多 MAX_CONCURRENT 个 Agent 同时执行，429 错误自动重试
   */
  async runMeetingWithProgress(
    goal: string,
    onProgress: (event: MeetingProgressEvent) => void,
  ): Promise<TeamRunResult> {
    const MAX_CONCURRENT = 2; // 并发限制
    const MAX_RETRIES = 3;    // 最大重试次数
    const BASE_DELAY = 2000;  // 基础延迟 2s
    const meetingId = `meeting-${Date.now()}`;

    // 发布会议开始事件
    eventBus.emit({
      type: 'meeting.started',
      source: 'meeting',
      timestamp: Date.now(),
      payload: {
        meetingId,
        topic: goal.substring(0, 100),
        participants: this.team.getAgents().map((a) => a.name),
      },
    });

    console.log(`[TeamOrchestrator] runMeetingWithProgress (concurrency=${MAX_CONCURRENT}): "${goal.substring(0, 60)}..." (meetingId: ${meetingId})`);

    const agents = this.team.getAgents();
    const agentResults = new Map<string, AgentRunResult>();
    const totalTokenUsage = { input_tokens: 0, output_tokens: 0 };

    // 通知所有 Agent 开始
    const agentConfigs = agents
      .map((agent, i) => ({ agent, config: this.agentConfigs.get(agent.name), index: i }))
      .filter((a): a is { agent: typeof a.agent; config: NonNullable<typeof a.config>; index: number } => !!a.config);

    for (const { config, index } of agentConfigs) {
      onProgress({
        type: 'agent_start',
        agent: config.id,
        name: config.name,
        role: config.role,
        index,
        total: agents.length,
      });
      onProgress({
        type: 'thinking',
        agent: config.id,
        name: config.name,
        message: `${config.name} 正在排队...`,
      });
    }

    // 带重试的 Agent 执行函数
    const prompt = `## 会议议题\n${goal}\n\n请从你的专业角度发表意见。简洁有力，突出重点。`;

    const runWithRetry = async (config: typeof agentConfigs[0]['config'], attempt = 1): Promise<AgentRunResult> => {
      try {
        const result = await this.omAgent.runAgent(
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
          prompt,
        );
        return result as unknown as AgentRunResult;
      } catch (err) {
        const is429 = err instanceof Error && (err.message.includes('429') || err.message.includes('Too many requests'));
        if (is429 && attempt < MAX_RETRIES) {
          const delay = BASE_DELAY * Math.pow(2, attempt - 1); // 指数退避
          console.log(`[TeamOrchestrator] ${config.id} 触发限流，${delay}ms 后重试 (${attempt}/${MAX_RETRIES})`);
          await new Promise(r => setTimeout(r, delay));
          return runWithRetry(config, attempt + 1);
        }
        throw err;
      }
    };

    // 并发控制：使用信号量限制同时执行的 Agent 数量
    let running = 0;
    const queue: (() => void)[] = [];

    const acquire = () => new Promise<void>(resolve => {
      if (running < MAX_CONCURRENT) {
        running++;
        resolve();
      } else {
        queue.push(resolve);
      }
    });

    const release = () => {
      if (queue.length > 0) {
        const next = queue.shift()!;
        next();
      } else {
        running--;
      }
    };

    // 并发执行所有 Agent（受信号量控制）
    const results = await Promise.allSettled(
      agentConfigs.map(async ({ config }) => {
        await acquire();
        try {
          const result = await runWithRetry(config);
          return { config, result };
        } finally {
          release();
        }
      }),
    );

    // 收集结果并发送进度事件
    for (let i = 0; i < results.length; i++) {
      const { config, index } = agentConfigs[i];
      const outcome = results[i];

      if (outcome.status === 'fulfilled') {
        const { result } = outcome.value;
        agentResults.set(config.name, result);
        totalTokenUsage.input_tokens += result.tokenUsage.input_tokens;
        totalTokenUsage.output_tokens += result.tokenUsage.output_tokens;

        onProgress({
          type: 'output',
          agent: config.id,
          name: config.name,
          role: config.role,
          output: result.output,
          toolCalls: result.toolCalls.length,
          index,
          total: agents.length,
        });
      } else {
        const errorMsg = outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error';
        console.error(`[TeamOrchestrator] meeting: ${config.id} 失败:`, errorMsg);

        onProgress({
          type: 'error',
          agent: config.id,
          name: config.name,
          error: errorMsg,
        });

        agentResults.set(config.name, {
          success: false,
          output: `❌ 执行失败: ${errorMsg}`,
          messages: [],
          tokenUsage: { input_tokens: 0, output_tokens: 0 },
          toolCalls: [],
        });
      }
    }

    onProgress({ type: 'done' });

    // 发布会议完成事件
    eventBus.emit({
      type: 'meeting.completed',
      source: 'meeting',
      timestamp: Date.now(),
      payload: {
        meetingId: `meeting-${Date.now()}`,
        topic: goal.substring(0, 100),
        participants: this.team.getAgents().map((a) => a.name),
        summary: '会议已完成（详见各 Agent 输出）',
        actionItems: [],
      },
    });

    return {
      success: true,
      goal,
      agentResults,
      totalTokenUsage: totalTokenUsage as TokenUsage,
    };
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
   * 广播消息给所有 Agent（同步 + 异步）
   */
  broadcast(from: string, content: string) {
    // 同步广播（兼容 OpenMultiAgent）
    this.team.broadcast(from, content);

    // 异步 MessageBus 广播（不阻塞）
    const messageBus = getGlobalMessageBus();
    messageBus.broadcast({
      from,
      type: 'chat',
      content,
    }).catch((err) => {
      console.warn('[TeamOrchestrator] MessageBus 广播失败:', err);
    });
  }

  /**
   * 异步广播 — 仅使用 MessageBus（真正的异步）
   */
  async asyncBroadcast(from: string, content: string): Promise<void> {
    const messageBus = getGlobalMessageBus();
    await messageBus.broadcast({
      from,
      type: 'chat',
      content,
    });
  }

  /**
   * 获取团队状态（不暴露上游类型）
   */
  getStatus(): OrchestratorStatus {
    return {
      teamAgents: this.team.getAgents().map((a) => ({
        name: a.name,
        model: a.model || 'default',
      })),
      sharedMemory: !!this.team.config?.sharedMemory,
    };
  }

  /**
   * 关闭编排器
   */
  async shutdown() {
    await this.omAgent.shutdown();
    console.log('[TeamOrchestrator] 已关闭');
  }

  // ── 智能路由入口（新增）──

  /**
   * handleRequest — 智能路由入口
   * 由 IntentRouter 分析用户意图，自动选择协作策略
   */
  async handleRequest(userQuery: string): Promise<TeamRunResult> {
    // 检查预算
    this.checkBudget('handleRequest', 10000);

    const decision = await this.intentRouter.route(userQuery);
    this.lastRoutingDecision = decision;

    console.log(`[IntentRouter] 决策: ${decision.strategy} | 复杂度: ${decision.complexity} | 理由: ${decision.reasoning.substring(0, 80)}`);

    switch (decision.strategy) {
      case 'single': {
        const agentId = decision.primaryAgent || 'dev-backend';
        const agentResult = await this.runAgent(agentId, userQuery);
        return {
          success: agentResult.success,
          goal: userQuery,
          agentResults: new Map([[agentId, agentResult]]),
          totalTokenUsage: agentResult.tokenUsage,
        };
      }
      case 'team': {
        return this.runTeam(userQuery);
      }
      case 'meeting': {
        return this.runMeeting(userQuery);
      }
      default:
        throw new Error(`Unknown routing strategy: ${decision.strategy}`);
    }
  }

  /**
   * 获取最后一次路由决策（用于调试和审计）
   */
  getLastRoutingDecision(): RoutingDecision | null {
    return this.lastRoutingDecision;
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
  workflowStateManager?: import('../session/WorkflowStateManager.js').WorkflowStateManager;
  tokenBudgetManager?: import('../telemetry/TokenBudgetManager.js').TokenBudgetManager;
}): TeamOrchestrator {
  const model = process.env.MODEL_NAME || 'mimo-v2.5-pro';
  const apiKey = process.env.API_KEY || '';
  const baseUrl = process.env.MODEL_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1';

  const commGuide = '\n\n团队通信：你可以使用 send_message 工具与其他 Agent 对话。\n- send_message({ to: "dev-backend", content: "..." }) — 发送给指定 Agent\n- send_message({ to: "*", content: "..." }) — 广播给所有 Agent\n可用的团队成员: dev-frontend, dev-backend, dev-testing, dev-devops, dev-pm, project-admin\n收到其他 Agent 的消息时，直接用 send_message 回复，不需要搜索文件系统。';

  const agents: TeamAgentConfig[] = [
    {
      id: 'dev-frontend',
      name: 'Frontend Agent',
      role: '前端开发专家 — React/Vue/TypeScript/CSS/Tailwind',
      systemPrompt: '你是前端开发专家，专注于 React、Vue、TypeScript、CSS、Tailwind。收到任务后给出具体可运行的代码方案。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['React/Vue/Angular 组件开发', 'TypeScript 类型设计', 'CSS/Tailwind 样式系统', '前端状态管理', '响应式设计', '前端性能优化'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['创建登录表单组件', '实现响应式导航栏', '配置 Tailwind 主题', '编写自定义 Hook', '优化首屏加载性能'],
    },
    {
      id: 'dev-backend',
      name: 'Backend Agent',
      role: '后端开发专家 — Python/Node.js/Go/API/数据库',
      systemPrompt: '你是后端开发专家，专注于 Python、Node.js、Go、API 设计、数据库。收到任务后给出具体可运行的代码方案。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['Python/Node.js/Go 服务端开发', 'API 设计与 RESTful/GraphQL', '数据库设计与优化', '微服务架构', 'Redis/消息队列', '性能调优'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['设计用户认证 API', '编写数据库迁移脚本', '实现缓存策略', '配置 CI/CD 流水线', '性能瓶颈分析'],
    },
    {
      id: 'dev-testing',
      name: 'Testing Agent',
      role: '测试专家 — pytest/Jest/Playwright/覆盖率',
      systemPrompt: '你是测试专家，专注于 pytest、Jest、Playwright、覆盖率。收到任务后给出具体的测试方案和用例。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['单元测试设计', '集成测试/E2E 测试', '测试覆盖率分析', 'Mock/Stub 策略', '自动化测试框架', '性能测试'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['编写用户登录的单元测试', '设计 E2E 测试用例', '分析测试覆盖率报告', '配置 Playwright 自动化', '性能基准测试'],
    },
    {
      id: 'dev-devops',
      name: 'DevOps Agent',
      role: '运维专家 — Docker/K8s/CI-CD/部署',
      systemPrompt: '你是 DevOps 专家，专注于 Docker、K8s、CI/CD、部署。收到任务后给出具体的部署方案。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['Docker 容器化', 'Kubernetes 编排', 'CI/CD 流水线', '云平台部署', '监控与日志', '基础设施即代码'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['编写 Dockerfile', '配置 K8s Deployment', '搭建 GitHub Actions 流水线', '配置 Prometheus 监控', 'Terraform 基础设施管理'],
    },
    {
      id: 'dev-pm',
      name: 'PM Agent',
      role: '产品经理 — PRD/需求分析/用户故事/产品策略',
      systemPrompt: '你是产品经理，专注于 PRD、需求分析、用户故事、产品策略。收到任务后给出结构化的产品文档。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['需求分析', '用户故事编写', 'PRD 文档', '竞品分析', '产品路线图', '数据驱动决策'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['编写用户登录功能 PRD', '设计用户旅程地图', '竞品功能对比分析', '制定迭代计划', '用户反馈分析'],
    },
    {
      id: 'project-admin',
      name: 'Project Admin',
      role: '项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调',
      systemPrompt: '你是项目管理员，专注于看板管理、里程碑规划、进度监控、风险识别、跨 Agent 任务协调。收到任务后给出项目管理方案和进度跟踪建议。' + commGuide,
      model, apiKey, baseUrl,
      expertise: ['项目进度跟踪', '任务分配与优先级', '里程碑管理', '风险识别', '跨团队协调', '敏捷流程'],
      tools: ['file_read', 'file_write', 'file_edit', 'bash', 'grep', 'glob'],
      typicalTasks: ['创建项目里程碑计划', '分配任务给各 Agent', '跟踪项目进度', '识别项目风险', '生成项目状态报告'],
    },
  ];

  return new TeamOrchestrator({ agents, defaultModel: model, apiKey, baseUrl, onProgress: options?.onProgress, workflowStateManager: options?.workflowStateManager, tokenBudgetManager: options?.tokenBudgetManager });
}
