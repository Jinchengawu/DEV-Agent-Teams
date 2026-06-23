/**
 * 统一的 Agent 服务器工厂
 *
 * 为所有 Agent 实例提供标准化的 HTTP 服务：
 * - /health — 健康检查
 * - /v1/chat/completions — LLM 调用（OpenAI 兼容格式）
 *
 * 每个 Agent 只需导入并传入自己的配置即可。
 */

import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

// ============================================================================
// 会话记忆存储（按 sessionId 保存对话历史）
// ============================================================================

const sessionMemory = new Map<string, ChatMessage[]>();
const MAX_MEMORY_SIZE = 50; // 每个会话最多保存 50 条消息

function getSessionHistory(sessionId: string): ChatMessage[] {
  return sessionMemory.get(sessionId) || [];
}

function appendToSession(sessionId: string, messages: ChatMessage[]): void {
  const history = sessionMemory.get(sessionId) || [];
  history.push(...messages);
  // 截断到最大长度
  if (history.length > MAX_MEMORY_SIZE) {
    history.splice(0, history.length - MAX_MEMORY_SIZE);
  }
  sessionMemory.set(sessionId, history);
}

function clearSession(sessionId: string): void {
  sessionMemory.delete(sessionId);
}

// ============================================================================
// Types
// ============================================================================

export interface AgentServerConfig {
  id: string;
  label: string;
  port: number;
  hermesPort?: number;
  skills: string[];
  tags: string[];
  systemPrompt: string;
  peers?: { host: string; port: number; id: string }[];
}

interface ChatMessage {
  role: string;
  content: string;
}

interface ChatCompletionRequest {
  model?: string;
  messages: ChatMessage[];
  max_tokens?: number;
  stream?: boolean;
  sessionId?: string;
}

// ============================================================================
// 从环境变量读取 API 配置（复用平台层的配置）
// ============================================================================

function getApiConfig() {
  return {
    model: process.env.MODEL_NAME || 'mimo-v2.5-pro',
    apiKey: process.env.API_KEY || '',
    baseUrl: process.env.MODEL_BASE_URL || 'https://token-plan-cn.xiaomimimo.com/v1',
  };
}

// ============================================================================
// 调用 LLM
// ============================================================================

async function callLLM(
  messages: ChatMessage[],
  maxTokens: number = 4000,
): Promise<{ content: string; usage?: { prompt_tokens: number; completion_tokens: number } }> {
  const { model, apiKey, baseUrl } = getApiConfig();

  if (!apiKey) {
    console.warn('[AgentServer] API_KEY 未配置，返回降级响应');
    return {
      content: '⚠️ 当前 Agent 未配置 LLM API Key，无法生成智能回复。请检查环境变量 API_KEY。',
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    };
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '未知错误');
      throw new Error(`LLM API ${response.status}: ${errorText}`);
    }

    const data = await response.json() as any;
    return {
      content: data.choices?.[0]?.message?.content || '',
      usage: data.usage || { prompt_tokens: 0, completion_tokens: 0 },
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[AgentServer] LLM 调用失败:', errorMsg);
    return {
      content: `❌ LLM 调用失败: ${errorMsg}`,
      usage: { prompt_tokens: 0, completion_tokens: 0 },
    };
  }
}

// ============================================================================
// 创建 Agent 服务器
// ============================================================================

export function createAgentServer(config: AgentServerConfig) {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    // 解析请求体
    const parseBody = (): Promise<any> =>
      new Promise((resolve) => {
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });

    const body = await parseBody();

    // 设置 CORS 头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    // ── Health Check ──
    if (req.url === '/health' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        status: 'ok',
        agent: config.id,
        label: config.label,
        port: config.port,
        hermesPort: config.hermesPort || config.port,
        skills: config.skills.length,
        capabilities: config.tags,
        uptime: process.uptime(),
      }));
      return;
    }

    // ── Chat Completions (OpenAI 兼容) ──
    if (req.url === '/v1/chat/completions' && req.method === 'POST') {
      const requestBody: ChatCompletionRequest = body;
      const sessionId = requestBody.sessionId || 'default';

      // 获取当前请求的消息
      const currentMessages = [...(requestBody.messages || [])];
      
      // 获取历史对话
      const history = getSessionHistory(sessionId);
      
      // 构建完整消息列表：system + 历史 + 当前
      const messages: ChatMessage[] = [];
      
      // 注入系统提示（增强版：声明记忆能力）
      const memoryNotice = `\n\n💡 你有记忆能力：当前对话的历史记录会自动保留，你可以参考之前的对话内容回答问题。`;
      const systemPrompt = config.systemPrompt + memoryNotice;
      
      if (!history.some((m) => m.role === 'system') && !currentMessages.some((m) => m.role === 'system')) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      // 添加历史（排除 system，因为上面已经加了）
      messages.push(...history.filter((m) => m.role !== 'system'));
      
      // 添加当前消息（排除 system，因为上面已经加了）
      messages.push(...currentMessages.filter((m) => m.role !== 'system'));
      
      console.log(`[AgentServer] ${config.id} 会话 ${sessionId} | 历史 ${history.length} 条 | 当前 ${currentMessages.length} 条`);

      const startTime = Date.now();
      const result = await callLLM(messages, requestBody.max_tokens || 4000);
      const latency = Date.now() - startTime;

      console.log(`[AgentServer] ${config.id} 响应 (${latency}ms): "${result.content.substring(0, 60)}..."`);

      // 保存到会话记忆（当前用户消息 + 助手回复）
      const userMessages = currentMessages.filter((m) => m.role === 'user');
      const assistantMessage: ChatMessage = { role: 'assistant', content: result.content };
      appendToSession(sessionId, [...userMessages, assistantMessage]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        id: `chatcmpl-${Date.now()}`,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: requestBody.model || 'agent',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: result.content },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: result.usage?.prompt_tokens || 0,
          completion_tokens: result.usage?.completion_tokens || 0,
          total_tokens: (result.usage?.prompt_tokens || 0) + (result.usage?.completion_tokens || 0),
        },
      }));
      return;
    }

    // ── 404 ──
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(config.port, () => {
    console.log(`🚀 ${config.label} 就绪 → http://127.0.0.1:${config.port}`);
    console.log(`   Agent ID: ${config.id}`);
    console.log(`   Skills: ${config.skills.join(', ')}`);
    console.log(`   Tags: ${config.tags.join(', ')}`);
  });

  return server;
}

// ============================================================================
// 便捷启动函数
// ============================================================================

export function startAgent(config: AgentServerConfig): void {
  createAgentServer(config);

  process.on('SIGINT', () => {
    console.log(`\n👋 ${config.label} 关闭`);
    process.exit(0);
  });
  process.on('SIGTERM', () => process.exit(0));
}
