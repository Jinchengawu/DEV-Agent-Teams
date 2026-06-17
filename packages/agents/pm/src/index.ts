/**
 * DEV-Agent PM Agent
 *
 * 定义产品经理 Agent 配置 + 轻量健康检查服务。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'dev-pm',
  name: 'PM Agent',
  role: '产品经理 — PRD/需求分析/用户故事/产品策略',
  port: parseInt(process.env.AGENT_PORT || '8205'),
  skills: [
    'prd-writing',
    'user-story-mapping',
    'requirements-analysis',
    'competitor-analysis',
    'product-strategy',
    'user-research',
    'roadmap-planning',
    'data-analysis',
  ],
  tags: ['pm', 'product', 'prd', 'requirement', 'strategy', '产品', '需求'],
};

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', agent: agentConfig.id, port: agentConfig.port }));
});

server.listen(agentConfig.port, () => {
  console.log(`🚀 ${agentConfig.name} listening on port ${agentConfig.port}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
