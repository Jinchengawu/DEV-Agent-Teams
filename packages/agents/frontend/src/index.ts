/**
 * DEV-Agent Frontend Agent
 *
 * 定义前端 Agent 配置 + 轻量健康检查服务。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

// ============================================================================
// Agent 配置（供 Gateway 使用）
// ============================================================================

export const agentConfig = {
  id: 'dev-frontend',
  name: 'Frontend Agent',
  role: '前端开发专家 — React/Vue/TypeScript/CSS/Tailwind',
  port: parseInt(process.env.AGENT_PORT || '8201'),
  skills: [
    'react-development',
    'vue-development',
    'nextjs-development',
    'css-tailwind',
    'typescript-best-practices',
    'performance-optimization',
  ],
  tags: ['react', 'vue', 'component', 'ui', 'css', 'typescript', 'frontend', '前端'],
};

// ============================================================================
// 轻量健康检查服务（用于 dev-agent status）
// ============================================================================

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', agent: agentConfig.id, port: agentConfig.port }));
});

server.listen(agentConfig.port, () => {
  console.log(`🚀 ${agentConfig.name} listening on port ${agentConfig.port}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
