/**
 * DEV-Agent AI 路由器 Hook
 * 
 * 根据任务内容路由到对应的 Agent
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

// ============================================================================
// Types
// ============================================================================

interface AgentInstance {
  id: string;
  label: string;
  port: number;
  hermes_port: number;
  tags: string[];
  skills: string[];
  timeout_ms: number;
}

interface RoutingConfig {
  instances: AgentInstance[];
  routing: {
    rules: { tags: string[]; instance: string }[];
    default: string;
  };
}

// ============================================================================
// Configuration Loader
// ============================================================================

function loadConfig(): RoutingConfig {
  const configPath = join(process.cwd(), 'config/openclaw/instances.yaml');
  
  if (!existsSync(configPath)) {
    return getDefaultConfig();
  }
  
  try {
    const content = readFileSync(configPath, 'utf-8');
    return parseYaml(content) as RoutingConfig;
  } catch (error) {
    console.error('[ai-router] 加载配置失败:', error);
    return getDefaultConfig();
  }
}

function getDefaultConfig(): RoutingConfig {
  return {
    instances: [
      {
        id: 'dev-frontend',
        label: '前端开发 Agent',
        port: 8201,
        hermes_port: 8201,
        tags: ['react', 'vue', 'typescript', 'css', '前端'],
        skills: ['react-development', 'vue-development'],
        timeout_ms: 120000,
      },
      {
        id: 'dev-backend',
        label: '后端开发 Agent',
        port: 8202,
        hermes_port: 8202,
        tags: ['api', 'database', 'python', 'node', '后端'],
        skills: ['python-development', 'nodejs-development'],
        timeout_ms: 120000,
      },
      {
        id: 'dev-testing',
        label: '测试开发 Agent',
        port: 8203,
        hermes_port: 8203,
        tags: ['test', 'jest', 'pytest', 'e2e', '测试'],
        skills: ['pytest-development', 'jest-development'],
        timeout_ms: 180000,
      },
      {
        id: 'dev-devops',
        label: 'DevOps Agent',
        port: 8204,
        hermes_port: 8204,
        tags: ['docker', 'k8s', 'deploy', 'devops', '运维'],
        skills: ['docker-management', 'kubernetes-deployment'],
        timeout_ms: 300000,
      },
      {
        id: 'dev-pm',
        label: '产品经理 Agent',
        port: 8205,
        hermes_port: 8205,
        tags: ['prd', 'requirement', 'product', 'strategy', 'pm', '产品', '需求'],
        skills: ['prd-writing', 'user-story-mapping', 'requirements-analysis'],
        timeout_ms: 120000,
      },
    ],
    routing: {
      rules: [],
      default: 'dev-backend',
    },
  };
}

// ============================================================================
// Intent Analysis
// ============================================================================

function analyzeIntent(message: string, config: RoutingConfig): AgentInstance | null {
  const lowerMessage = message.toLowerCase();
  
  // 计算每个实例的匹配分数
  const scores = config.instances.map(instance => {
    let score = 0;
    
    for (const tag of instance.tags) {
      if (lowerMessage.includes(tag.toLowerCase())) {
        score += 10;
      }
    }
    
    return { instance, score };
  });
  
  // 按分数排序
  scores.sort((a, b) => b.score - a.score);
  
  // 返回最高分的实例（如果分数 > 0）
  return scores[0].score > 0 ? scores[0].instance : null;
}

// ============================================================================
// Hermes Caller
// ============================================================================

async function callHermes(
  instance: AgentInstance,
  message: string,
  skills: string[]
): Promise<string> {
  try {
    // 构建系统提示
    const systemPrompt = buildSystemPrompt(instance, skills);
    
    const response = await fetch(`http://127.0.0.1:${instance.hermes_port}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'hermes-agent',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(instance.timeout_ms),
    });

    if (response.ok) {
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '无法生成响应';
    }
    
    return `Hermes 调用失败: ${response.status}`;
  } catch (error) {
    return `Hermes 连接失败: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

function buildSystemPrompt(instance: AgentInstance, skills: string[]): string {
  return `你是一个专业的${instance.label}，专注于 ${instance.tags.join(', ')} 领域。

你的技能包括：
${skills.map(s => `- ${s}`).join('\n')}

请根据用户的需求，提供专业的建议和代码示例。`;
}

// ============================================================================
// Main Handler
// ============================================================================

const handler = async (event: any) => {
  if (event.type !== 'message' || event.action !== 'received') {
    return;
  }
  
  const { content } = event.context;
  
  if (!content || content.startsWith('/')) {
    return;
  }
  
  console.log(`[ai-router] 收到消息: "${content.substring(0, 50)}..."`);
  
  // 加载配置
  const config = loadConfig();
  
  // 分析意图
  const instance = analyzeIntent(content, config);
  
  if (!instance) {
    console.log('[ai-router] 未匹配到 Agent，使用默认实例');
    const defaultInstance = config.instances.find(i => i.id === config.routing.default);
    if (defaultInstance) {
      const response = await callHermes(defaultInstance, content, defaultInstance.skills);
      event.messages.push({
        role: 'assistant',
        content: response,
      });
    }
    return;
  }
  
  console.log(`[ai-router] 路由到: ${instance.label} (${instance.id})`);
  
  // 调用 Hermes
  const response = await callHermes(instance, content, instance.skills);
  
  event.messages.push({
    role: 'assistant',
    content: response,
  });
};

export default handler;
