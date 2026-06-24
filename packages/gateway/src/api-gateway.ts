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
import { mkdirSync, existsSync, createWriteStream } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from 'dotenv';
import { createAgentApp } from '@dev-agent/core';
import type { OrchestratorEvent, MeetingProgressEvent } from '@dev-agent/core';
import Busboy from 'busboy';
import { randomUUID } from 'node:crypto';
import { loadGatewayConfig } from './config/types.js';
import { writeAuditLog } from './middleware/auditLogger.js';
import { executeRoute } from './router/index.js';

// 加载项目根目录的 .env 文件
const __dirname = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(__dirname, '../../../.env') });

// 从 AgentRunResult 中提取格式化输出（兼容多种 content 格式）
function extractOutput(agentResult: { output: string; toolCalls: { toolName: string }[]; success: boolean }): string {
  const parts: string[] = [];
  if (agentResult.output) parts.push(agentResult.output);
  if (agentResult.toolCalls.length > 0) {
    const toolNames = [...new Set(agentResult.toolCalls.map((tc) => tc.toolName))];
    parts.push(`📊 执行了 ${agentResult.toolCalls.length} 个操作 (${toolNames.join(', ')})`);
  }
  return parts.join('\n') || (agentResult.success ? '✅ 任务完成' : '❌ 任务失败');
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  const config = loadGatewayConfig();

  console.log('🧠 DEV-Agent-Teams Gateway');
  console.log('==========================');
  console.log(`📦 编排框架: @open-multi-agent/core`);
  console.log(`🔗 端口: ${config.host}:${config.port}`);
  console.log('');

  // 创建 agent app（内含 TeamOrchestrator + SessionManager + Express 路由 + PipelineOrchestrator）
  const agentApp = await createAgentApp({
    onProgress: (event: OrchestratorEvent) => {
      if (event.type === 'task_start' || event.type === 'task_complete') {
        console.log(`[progress] ${event.type}: ${event.task ?? ''}`);
      }
    },
  });

  // 加载示例 Pipeline
  try {
    const { readFileSync } = await import('node:fs');
    const { parse } = await import('yaml');
    const yamlPath = resolve(__dirname, '../../core/src/pipeline/examples/stock-analysis.yaml');
    const yamlContent = readFileSync(yamlPath, 'utf-8');
    const pipelineDef = parse(yamlContent) as import('@dev-agent/core').PipelineDefinition;
    agentApp.pipelineOrchestrator.loadPipeline(pipelineDef);
    console.log(`[Gateway] Pipeline "${pipelineDef.name}" 已加载`);
  } catch (err) {
    console.warn('[Gateway] Pipeline 加载失败:', err);
  }
  const server = createServer(async (req, res) => {
    const startTime = Date.now();
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const path = url.pathname;

    // 文件上传 — 需要原始 req 流，必须在收集请求体之前处理
    if (path === '/upload' && req.method === 'POST') {
      const uploadDir = join(process.cwd(), 'uploads');
      if (!existsSync(uploadDir)) mkdirSync(uploadDir, { recursive: true });

      const busboy = Busboy({ headers: req.headers });
      const files: Array<{ filename: string; originalname: string; path: string; size: number; mimetype: string }> = [];

      busboy.on('file', (name, file, info) => {
        const ext = info.filename.includes('.') ? info.filename.split('.').pop() : '';
        const filename = `${randomUUID()}${ext ? '.' + ext : ''}`;
        const filepath = join(uploadDir, filename);
        const stream = createWriteStream(filepath);
        let size = 0;
        file.on('data', (chunk: Buffer) => { size += chunk.length; });
        file.pipe(stream);
        files.push({ filename, originalname: info.filename, path: filepath, size, mimetype: info.mimeType });
      });

      busboy.on('close', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ files }));
      });

      busboy.on('error', (err: Error) => {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });

      req.pipe(busboy);
      return;
    }

    // 收集请求体
    let body = '';
    for await (const chunk of req) body += chunk;

    // 只解析 JSON 请求体，multipart 等非 JSON 请求体跳过
    let parsedBody: any = {};
    const contentType = req.headers['content-type'] || '';
    if (contentType.includes('application/json') && body) {
      try { parsedBody = JSON.parse(body); } catch { parsedBody = {}; }
    }

    // 构造 Express 兼容的 req/res 对象，转发到 agent app
    const { app } = agentApp;

    // 使用 Express 的 handle 方法
    const expressReq = Object.assign(req, {
      body: parsedBody,
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

      // Pipeline 执行
      if (path === '/v1/pipeline/execute' && req.method === 'POST') {
        const request = body ? JSON.parse(body) : {};
        const { pipelineId, initialInput } = request;

        if (!pipelineId) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'pipelineId is required' }));
          return;
        }

        try {
          const instance = await agentApp.pipelineOrchestrator.execute(pipelineId, initialInput);
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            instanceId: instance.id,
            status: instance.status,
            surfaceResults: Object.fromEntries(instance.surfaceResults),
            startedAt: instance.startedAt,
            completedAt: instance.completedAt,
          }));
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: errorMsg }));
        }
        return;
      }

      // 列出所有 Pipeline 定义
      if (path === '/pipelines' && req.method === 'GET') {
        const pipelines = agentApp.pipelineOrchestrator.listPipelines();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ pipelines }));
        return;
      }

      // 列出所有 Pipeline 实例
      if (path === '/pipeline-instances' && req.method === 'GET') {
        const instances = agentApp.pipelineOrchestrator.listInstances();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          instances: instances.map((i) => agentApp.pipelineOrchestrator.serializeInstance(i)),
        }));
        return;
      }

      // 获取 Pipeline 实例状态
      if (path.startsWith('/pipeline-instances/') && req.method === 'GET') {
        const instanceId = path.split('/')[2];
        const instance = agentApp.pipelineOrchestrator.getStatus(instanceId);
        if (!instance) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Instance not found' }));
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(agentApp.pipelineOrchestrator.serializeInstance(instance)));
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
        let userText = typeof userContent === 'string' ? userContent : JSON.stringify(userContent || '');

        // 处理附件（图片转 base64）
        if (request.attachments && Array.isArray(request.attachments)) {
          const imageParts: string[] = [];
          for (const att of request.attachments) {
            if (att.mimetype?.startsWith('image/')) {
              try {
                const { readFile } = await import('node:fs/promises');
                const data = await readFile(att.path);
                const base64 = data.toString('base64');
                imageParts.push(`![${att.originalname}](data:${att.mimetype};base64,${base64})`);
              } catch (e) {
                console.error('[upload] 读取文件失败:', e);
              }
            }
          }
          if (imageParts.length > 0) {
            userText += '\n\n' + imageParts.join('\n');
          }
        }

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

        // 委托给路由模块
        const result = await executeRoute({
          mode,
          agentId: requestedAgentId,
          userText,
          sessionId: sid,
          agentApp,
        });

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
          routedBy: result.routedBy,
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

      // 静态文件服务 — 上传的文件访问
      if (path.startsWith('/uploads/')) {
        const filename = path.replace('/uploads/', '');
        const filepath = join(process.cwd(), 'uploads', filename);
        try {
          const data = await import('node:fs').then(m => m.promises.readFile(filepath));
          const ext = filename.split('.').pop() || '';
          const mimeTypes: Record<string, string> = {
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
            svg: 'image/svg+xml', pdf: 'application/pdf', txt: 'text/plain',
            md: 'text/markdown', json: 'application/json', csv: 'text/csv',
            sql: 'text/plain', yaml: 'text/yaml', yml: 'text/yaml',
          };
          res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
          res.end(data);
        } catch {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'File not found' }));
        }
        return;
      }

      // 知识中心 API
      if (path.startsWith('/knowledge') && req.method === 'GET') {
        const kc = agentApp.knowledgeCenter;
        if (!kc) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'KnowledgeCenter not available' }));
          return;
        }

        // /knowledge/search?q=...
        if (path === '/knowledge/search') {
          const q = url.searchParams.get('q') || '';
          const type = url.searchParams.get('type') || undefined;
          const limit = parseInt(url.searchParams.get('limit') || '20', 10);
          const results = kc.search({ q, type, limit, semantic: true });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ query: q, results }));
          return;
        }

        // /knowledge/stats
        if (path === '/knowledge/stats') {
          const stats = kc.stats();
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(stats));
          return;
        }

        // /knowledge/:id
        const knowledgeIdMatch = path.match(/^\/knowledge\/(.+)$/);
        if (knowledgeIdMatch) {
          const docId = knowledgeIdMatch[1];
          const doc = kc.getDocument(docId);
          if (!doc) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Document not found' }));
            return;
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(doc));
          return;
        }

        // /knowledge (list)
        const type = url.searchParams.get('type') || undefined;
        const source = url.searchParams.get('source') || undefined;
        const limit = parseInt(url.searchParams.get('limit') || '50', 10);
        const offset = parseInt(url.searchParams.get('offset') || '0', 10);
        const docs = kc.listDocuments({ type, source, limit, offset });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ documents: docs, total: docs.length }));
        return;
      }

      // 知识中心自然语言查询
      if (path === '/knowledge/query' && req.method === 'POST') {
        const kc = agentApp.knowledgeCenter;
        if (!kc) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'KnowledgeCenter not available' }));
          return;
        }
        const request = body ? JSON.parse(body) : {};
        const { question, limit } = request;
        if (!question) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'question is required' }));
          return;
        }
        const answer = await kc.query(question, { limit });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(answer));
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

main().catch((error) => {
  console.error('❌ Gateway 启动失败:', error);
  process.exit(1);
});
