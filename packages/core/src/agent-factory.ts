/**
 * Agent App — 基于 @open-multi-agent/core 的 HTTP API 层
 *
 * 职责：
 * - 提供 OpenAI 兼容的 /v1/chat/completions 端点
 * - 会话持久化（SessionManager + SQLite）
 * - 健康检查
 * - 委托 TeamOrchestrator 处理所有 Agent 编排
 */

import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
import express from 'express';
import { SessionManager } from './session/SessionManager';
import { TeamOrchestrator, createDevTeamOrchestrator } from './team/TeamOrchestrator';
import type { OrchestratorEvent } from '@open-multi-agent/core';

// ============================================================================
// Types
// ============================================================================

export interface AgentAppConfig {
  /** 数据库目录，默认 ~/.dev-agent/data */
  dataDir?: string;
  /** 进度回调（用于 Dashboard 实时展示） */
  onProgress?: (event: OrchestratorEvent) => void;
}

export interface AgentApp {
  app: express.Application;
  sessionManager: SessionManager;
  orchestrator: TeamOrchestrator;
  close: () => Promise<void>;
}

// ============================================================================
// Factory
// ============================================================================

export function createAgentApp(config: AgentAppConfig = {}): AgentApp {
  const dataDir = config.dataDir || process.env.AGENT_DB_PATH || path.join(os.homedir(), '.dev-agent/data');
  mkdirSync(dataDir, { recursive: true });
  const dbPath = path.join(dataDir, 'sessions.db');

  const sessionManager = new SessionManager(dbPath);
  const orchestrator = createDevTeamOrchestrator({ onProgress: config.onProgress });

  const app = express();
  app.use(express.json({ limit: '1mb' }));

  // Per-session concurrency lock
  const sessionLocks = new Map<string, Promise<void>>();

  async function withSessionLock(sessionId: string, fn: () => Promise<void>): Promise<void> {
    const prev = sessionLocks.get(sessionId) || Promise.resolve();
    const next = prev.then(fn, fn);
    sessionLocks.set(sessionId, next.then(() => {}, () => {}));
    await next;
  }

  // ── Health ──
  app.get('/health', (_req, res) => {
    const status = orchestrator.getStatus();
    res.json({
      status: 'ok',
      framework: '@open-multi-agent/core',
      agents: status.teamAgents.length,
      sharedMemory: status.sharedMemory,
      sessionCount: sessionManager.getSessionCount(),
      messagesProcessed: sessionManager.getTotalMessageCount(),
      uptime: process.uptime(),
    });
  });

  // ── Chat Completions（OpenAI 兼容）──
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const { messages, sessionId: clientSessionId, mode } = req.body;

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        res.status(400).json({ error: 'messages is required' });
        return;
      }

      // 会话管理
      let sessionId = clientSessionId || '';
      if (!sessionId || !sessionManager.getSession(sessionId)) {
        sessionId = sessionManager.createSession('', clientSessionId || '');
      }

      const messagesArr = messages as { role: string; content: unknown }[];
      const lastUserMsg = [...messagesArr].reverse().find((m) => m.role === 'user');
      const userContent = lastUserMsg?.content;

      if (!userContent) {
        res.status(400).json({ error: 'No user message found' });
        return;
      }

      const userText = typeof userContent === 'string' ? userContent : JSON.stringify(userContent);

      // 保存用户消息
      await withSessionLock(sessionId, async () => {
        const existingMessages = sessionManager.getAllMessages(sessionId);
        const lastStored = existingMessages.filter((m) => m.role === 'user').pop();
        if (!lastStored || lastStored.content !== userText) {
          sessionManager.addMessage(sessionId, 'user', userText, 'user');
        }
      });

      // 设置会话标题（第一条消息）
      const totalUserMessages = sessionManager.getMessages(sessionId).filter((m) => m.role === 'user').length;
      if (totalUserMessages === 1) {
        sessionManager.updateSession(sessionId, { title: userText.substring(0, 100) });
      }

      // 委托给 TeamOrchestrator
      let result: { output: string; agent: string };

      if (mode === 'team') {
        // 多 Agent 协同模式
        const teamResult = await orchestrator.runTeam(userText);
        result = {
          output: teamResult.agentResults.get('coordinator')?.output || JSON.stringify(teamResult),
          agent: 'team',
        };
      } else {
        // 单 Agent 模式 — 简单意图路由
        const agentId = detectAgent(userText);
        const agentResult = await orchestrator.runAgent(agentId, userText);
        result = {
          output: agentResult.output,
          agent: agentId,
        };
      }

      // 保存助手回复
      await withSessionLock(sessionId, async () => {
        sessionManager.addMessage(sessionId, 'assistant', result.output, result.agent);
      });

      res.json({
        id: `chatcmpl-${Date.now()}`,
        sessionId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: result.agent,
        choices: [
          {
            index: 0,
            message: { role: 'assistant', content: result.output },
            finish_reason: 'stop',
          },
        ],
        instance: result.agent,
        routedBy: mode === 'team' ? 'team-orchestrator' : 'intent-router',
      });
    } catch (error) {
      console.error('[agent-app] Chat error:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Internal server error' });
    }
  });

  // ── Agent List ──
  app.get('/agents', (_req, res) => {
    res.json({ agents: orchestrator.getStatus().teamAgents });
  });

  // ── Session Endpoints ──
  app.get('/v1/sessions', (_req, res) => {
    const sessions = sessionManager.listSessions();
    res.json({ sessions });
  });

  app.get('/v1/sessions/:id', (req, res) => {
    const session = sessionManager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }
    const messages = sessionManager.getAllMessages(req.params.id);
    res.json({ session, messages });
  });

  // ── Close ──
  const close = async () => {
    await orchestrator.shutdown();
    sessionManager.close();
  };

  return { app, sessionManager, orchestrator, close };
}

// ============================================================================
// 简意图路由（单 Agent 模式下使用）
// ============================================================================

function detectAgent(message: string): string {
  const lower = message.toLowerCase();

  const rules: [string[], string][] = [
    [['react', 'vue', 'component', 'ui', 'css', 'tailwind', '前端', '界面', '组件', '样式'], 'dev-frontend'],
    [['api', 'database', 'server', 'python', 'node', 'go', '后端', '接口', '数据库', '服务器'], 'dev-backend'],
    [['test', 'unit', 'e2e', 'coverage', 'jest', 'pytest', '测试', '单元测试', '覆盖率'], 'dev-testing'],
    [['docker', 'k8s', 'deploy', 'ci/cd', 'devops', '运维', '容器', '部署'], 'dev-devops'],
    [['prd', 'requirement', 'product', 'strategy', 'user-story', 'pm', '产品', '需求'], 'dev-pm'],
  ];

  for (const [keywords, agentId] of rules) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return agentId;
    }
  }

  return 'dev-backend'; // 默认
}
