/**
 * API Gateway — DEV-Agent-Teams 统一入口
 *
 * 职责：
 * 1. 统一 HTTP 入口（Dashboard → Gateway → Agent）
 * 2. 审计日志
 * 3. 转发请求到 agent-factory 的 Express 应用
 *
 * 编排能力由 @open-multi-agent/core 的 TeamOrchestrator 提供，
 * 本 Gateway 不重复实现路由、限流、熔断等逻辑。
 */

import { createServer } from 'node:http';
import { appendFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createAgentApp } from '@dev-agent/core';
import type { OrchestratorEvent, MeetingProgressEvent } from '@dev-agent/core';

// 加载项目根目录的 .env 文件
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

// ============================================================================
// Config
// ============================================================================

interface GatewayConfig {
  host: string;
  port: number;
  auditFile: string;
}

function loadConfig(): GatewayConfig {
  return {
    host: process.env.GATEWAY_HOST || '127.0.0.1',
    port: parseInt(process.env.GATEWAY_PORT || '8400', 10),
    auditFile: process.env.AUDIT_FILE || join(
      process.env.HOME || '~',
      '.dev-agent/logs/audit.log',
    ),
  };
}

// ============================================================================
// Audit Logger
// ============================================================================

interface AuditEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  latencyMs: number;
  agent?: string;
  mode?: string;
  error?: string;
}

function writeAuditLog(entry: AuditEntry, file: string): void {
  try {
    const dir = dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    appendFileSync(file, JSON.stringify(entry) + '\n');
  } catch (err) {
    console.error('[audit] 写入失败:', err);
  }
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const config = loadConfig();

  console.log('🧠 DEV-Agent-Teams Gateway');
  console.log('==========================');
  console.log(`📦 编排框架: @open-multi-agent/core`);
  console.log(`🔗 端口: ${config.host}:${config.port}`);
  console.log('');

  // 创建 agent app（内含 TeamOrchestrator + SessionManager + Express 路由）
  const agentApp = createAgentApp({
    onProgress: (event: OrchestratorEvent) => {
      if (event.type === 'task_start' || event.type === 'task_complete') {
        console.log(`[progress] ${event.type}: ${event.task ?? ''}`);
      }
    },
  });

  // 将 agent app 的路由挂载到 Gateway
  const server = createServer(async (req, res) => {
    const startTime = Date.now();
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // 收集请求体
    let body = '';
    for await (const chunk of req) body += chunk;

    // 构造 Express 兼容的 req/res 对象，转发到 agent app
    const { app } = agentApp;

    // 使用 Express 的 handle 方法
    const expressReq = Object.assign(req, {
      body: body ? JSON.parse(body) : {},
      url: req.url,
      path,
    });

    // 简化处理：直接调用 agent app 的路由
    try {
      // 健康检查
      if (path === '/health' && req.method === 'GET') {
        const status = agentApp.orchestrator.getStatus();
        const response = {
          status: 'ok',
          gateway: 'dev-agent-teams',
          framework: '@open-multi-agent/core',
          agents: status.teamAgents.length,
          sharedMemory: status.sharedMemory,
          sessionCount: agentApp.sessionManager.getSessionCount(),
          uptime: process.uptime(),
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));
        writeAuditLog({
          timestamp: new Date().toISOString(),
          method: 'GET',
          path,
          status: 200,
          latencyMs: Date.now() - startTime,
        }, config.auditFile);
        return;
      }

      // Agent 列表
      if (path === '/agents' && req.method === 'GET') {
        const agents = agentApp.orchestrator.getStatus().teamAgents;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ agents }));
        writeAuditLog({
          timestamp: new Date().toISOString(),
          method: 'GET',
          path,
          status: 200,
          latencyMs: Date.now() - startTime,
        }, config.auditFile);
        return;
      }

      // Chat Completions
      if (path === '/v1/chat/completions' && req.method === 'POST') {
        const request = body ? JSON.parse(body) : {};
        const { messages, sessionId, mode, agentId: requestedAgentId } = request;

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'messages is required' }));
          return;
        }

        const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user');
        const userContent = lastUserMsg?.content;
        const userText = typeof userContent === 'string' ? userContent : JSON.stringify(userContent || '');

        // 会话管理
        let sid = sessionId || '';
        if (!sid || !agentApp.sessionManager.getSession(sid)) {
          sid = agentApp.sessionManager.createSession('', sessionId || '');
        }

        // 保存用户消息
        const existingMessages = agentApp.sessionManager.getAllMessages(sid);
        const lastStored = existingMessages.filter((m) => m.role === 'user').pop();
        if (!lastStored || lastStored.content !== userText) {
          agentApp.sessionManager.addMessage(sid, 'user', userText, 'user');
        }

        // 设置标题
        const totalUser = agentApp.sessionManager.getMessages(sid).filter((m) => m.role === 'user').length;
        if (totalUser === 1) {
          agentApp.sessionManager.updateSession(sid, { title: userText.substring(0, 100) });
        }

        // 委托给编排器
        let result: { output: string; agent: string };
        let routedBy: string;

        if (mode === 'team') {
          // 先用 runTeam 让协调员分析目标
          // 如果协调员短路到单个 Agent，结果已经足够好
          // 如果需要多 Agent 协作，runTeam 内部会自动分解
          const teamResult = await agentApp.orchestrator.runTeam(userText);

          // 从 AgentRunResult 中提取文本输出
          function extractOutput(agentResult: { output: string; messages: { role: string; content: { type: string; text?: string }[] }[]; toolCalls: { toolName: string; input: Record<string, unknown>; output: string }[] }): string {
            // 收集所有 assistant 消息中的文本（包括 reasoning 和 text 类型）
            const allText: string[] = [];
            for (const msg of agentResult.messages) {
              if (msg.role === 'assistant') {
                for (const block of msg.content) {
                  if ((block.type === 'text' || block.type === 'reasoning') && block.text) {
                    allText.push(block.text);
                  }
                }
              }
            }
            const combined = allText.join('\n').trim();

            // 构建结果
            const parts: string[] = [];
            if (combined) {
              parts.push(combined);
            }

            // 补充 tool call 摘要
            if (agentResult.toolCalls.length > 0) {
              const toolNames = [...new Set(agentResult.toolCalls.map((tc) => tc.toolName))];
              parts.push(`\n📊 执行了 ${agentResult.toolCalls.length} 个操作 (${toolNames.join(', ')})`);
            }

            return parts.join('\n') || (agentResult.success ? '✅ 任务完成' : '❌ 任务失败');
          }

          // 构建结构化输出：汇总协调员结论 + 各 Agent 贡献
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

          result = { output, agent: 'team' };
          routedBy = 'team-orchestrator';
        } else if (mode === 'meeting') {
          // 圆桌会议模式 — 所有 Agent 顺序发言
          const meetingResult = await agentApp.orchestrator.runMeeting(userText);

          function extractOutput(agentResult: { output: string; messages: { role: string; content: { type: string; text?: string }[] }[]; toolCalls: { toolName: string; input: Record<string, unknown>; output: string }[] }): string {
            const allText: string[] = [];
            for (const msg of agentResult.messages) {
              if (msg.role === 'assistant') {
                for (const block of msg.content) {
                  if ((block.type === 'text' || block.type === 'reasoning') && block.text) {
                    allText.push(block.text);
                  }
                }
              }
            }
            return allText.join('\n').trim() || agentResult.output || (agentResult.success ? '✅ 任务完成' : '❌ 任务失败');
          }

          const meetingParts: string[] = [];
          for (const [name, agentResult] of meetingResult.agentResults) {
            const output = extractOutput(agentResult);
            if (output) {
              const agentConf = agentApp.orchestrator.getStatus().teamAgents.find((a: { name: string }) => a.name === name);
              meetingParts.push(`\n---\n## 🧑‍💼 ${name}${agentConf ? `（${agentConf.model}）` : ''}\n${output}`);
            }
          }
          result = { output: meetingParts.join('\n') || '会议完成', agent: 'meeting' };
          routedBy = 'meeting-orchestrator';
        } else {
          // 单 Agent 模式 — 优先使用请求指定的 agentId，否则自动检测
          const agentId = normalizeAgentId(requestedAgentId) || detectAgent(userText);
          const agentResult = await agentApp.orchestrator.runAgent(agentId, userText);
          result = { output: agentResult.output, agent: agentId };
          routedBy = requestedAgentId ? 'client-specified' : 'intent-router';
        }

        // 保存助手回复
        agentApp.sessionManager.addMessage(sid, 'assistant', result.output, result.agent);

        const response = {
          id: `chatcmpl-${Date.now()}`,
          sessionId: sid,
          object: 'chat.completion',
          created: Math.floor(Date.now() / 1000),
          model: result.agent,
          choices: [{
            index: 0,
            message: { role: 'assistant', content: result.output },
            finish_reason: 'stop',
          }],
          instance: result.agent,
          routedBy,
        };

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response));

        writeAuditLog({
          timestamp: new Date().toISOString(),
          method: 'POST',
          path,
          status: 200,
          latencyMs: Date.now() - startTime,
          agent: result.agent,
          mode,
        }, config.auditFile);
        return;
      }

      // Sessions
      if (path === '/v1/sessions' && req.method === 'GET') {
        const sessions = agentApp.sessionManager.listSessions();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ sessions }));
        return;
      }

      // Session detail (messages)
      const sessionMatch = path.match(/^\/v1\/sessions\/([^/]+)$/);
      if (sessionMatch && req.method === 'GET') {
        const sessionId = sessionMatch[1];
        const session = agentApp.sessionManager.getSession(sessionId);
        if (!session) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }
        const messages = agentApp.sessionManager.getAllMessages(sessionId);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ session, messages }));
        return;
      }

      // Meeting SSE Stream — 流式会议进度
      if (path === '/v1/meeting/stream' && req.method === 'POST') {
        const request = body ? JSON.parse(body) : {};
        const { message, sessionId, topicId } = request;

        if (!message) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'message is required' }));
          return;
        }

        // SSE 头
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        });

        const sendEvent = (data: Record<string, unknown>) => {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
          // 强制刷新，确保事件立即发送到客户端
          if (typeof (res as any).flush === 'function') {
            (res as any).flush();
          }
        };

        try {
          // 会话管理
          const sid = sessionId || `meeting-${topicId || Date.now()}`;
          if (!agentApp.sessionManager.getSession(sid)) {
            agentApp.sessionManager.createSession('', sid);
          }
          agentApp.sessionManager.addMessage(sid, 'user', message, 'user');

          sendEvent({ type: 'start', sessionId: sid });

          const meetingResult = await agentApp.orchestrator.runMeetingWithProgress(
            message,
            (event: MeetingProgressEvent) => {
              sendEvent(event);
            },
          );

          // 组装最终输出
          function extractOutput(agentResult: { output: string; messages: { role: string; content: { type: string; text?: string }[] }[]; toolCalls: { toolName: string; input: Record<string, unknown>; output: string }[] }): string {
            const allText: string[] = [];
            for (const msg of agentResult.messages) {
              if (msg.role === 'assistant') {
                for (const block of msg.content) {
                  if ((block.type === 'text' || block.type === 'reasoning') && block.text) {
                    allText.push(block.text);
                  }
                }
              }
            }
            return allText.join('\n').trim() || agentResult.output || (agentResult.success ? '✅ 任务完成' : '❌ 任务失败');
          }

          const parts: string[] = [];
          for (const [name, agentResult] of meetingResult.agentResults) {
            const output = extractOutput(agentResult);
            if (output) {
              const config = agentApp.orchestrator.getStatus().teamAgents.find((a: { name: string }) => a.name === name);
              parts.push(`\n---\n## 🧑‍💼 ${name}${config ? `（${config.model}）` : ''}\n${output}`);
            }
          }
          const finalOutput = parts.join('\n') || '会议完成';

          agentApp.sessionManager.addMessage(sid, 'assistant', finalOutput, 'meeting');

          sendEvent({
            type: 'complete',
            output: finalOutput,
            sessionId: sid,
          });
        } catch (err) {
          sendEvent({
            type: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        }

        res.end();
        return;
      }

      // 404
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      console.error('[gateway] Error:', errorMsg);

      writeAuditLog({
        timestamp: new Date().toISOString(),
        method: req.method || 'GET',
        path,
        status: 500,
        latencyMs: Date.now() - startTime,
        error: errorMsg,
      }, config.auditFile);

      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: errorMsg }));
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(`✅ Gateway 就绪 → http://${config.host}:${config.port}`);
    console.log('');
    console.log('📡 端点:');
    console.log('  GET  /health              — 健康检查');
    console.log('  GET  /agents              — Agent 列表');
    console.log('  POST /v1/chat/completions — 对话（OpenAI 兼容）');
    console.log('  GET  /v1/sessions         — 会话列表');
    console.log('');
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 正在关闭...');
    await agentApp.close();
    server.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await agentApp.close();
    server.close();
    process.exit(0);
  });
}

// ============================================================================
// 简意图路由
// ============================================================================

// Agent ID 映射 — 处理 Dashboard 可能发送的短格式
const AGENT_ID_MAP: Record<string, string> = {
  'frontend': 'dev-frontend',
  'backend': 'dev-backend',
  'testing': 'dev-testing',
  'devops': 'dev-devops',
  'pm': 'dev-pm',
  'project-admin': 'project-admin',
  'dev-frontend': 'dev-frontend',
  'dev-backend': 'dev-backend',
  'dev-testing': 'dev-testing',
  'dev-devops': 'dev-devops',
  'dev-pm': 'dev-pm',
};

function normalizeAgentId(agentId: string): string {
  return AGENT_ID_MAP[agentId] || agentId;
}

function detectAgent(message: string): string {
  const lower = message.toLowerCase();

  const rules: [string[], string][] = [
    [['react', 'vue', 'component', 'ui', 'css', 'tailwind', '前端', '界面', '组件', '样式'], 'dev-frontend'],
    [['api', 'database', 'server', 'python', 'node', 'go', '后端', '接口', '数据库', '服务器'], 'dev-backend'],
    [['test', 'unit', 'e2e', 'coverage', 'jest', 'pytest', '测试', '单元测试', '覆盖率'], 'dev-testing'],
    [['docker', 'k8s', 'deploy', 'ci/cd', 'devops', '运维', '容器', '部署'], 'dev-devops'],
    [['prd', 'requirement', 'product', 'strategy', 'user-story', 'pm', '产品', '需求'], 'dev-pm'],
    [['project', 'admin', 'kanban', 'milestone', '进度', '里程碑', '看板', '任务管理'], 'project-admin'],
  ];

  for (const [keywords, agentId] of rules) {
    for (const kw of keywords) {
      if (lower.includes(kw)) return agentId;
    }
  }

  return 'dev-backend';
}

main().catch((error) => {
  console.error('❌ Gateway 启动失败:', error);
  process.exit(1);
});
