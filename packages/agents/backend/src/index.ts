/**
 * DEV-Agent Backend Agent
 *
 * 定义后端 Agent 配置 + 轻量健康检查服务。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'dev-backend',
  name: 'Backend Agent',
  role: '后端开发专家 — Python/Node.js/Go/API/数据库',
  port: parseInt(process.env.AGENT_PORT || '8202'),
  skills: [
    'python-development',
    'nodejs-development',
    'go-development',
    'rust-development',
    'api-design',
    'database-design',
    'grpc',
    'microservices',
  ],
  tags: ['api', 'database', 'server', 'python', 'node', 'go', 'backend', '后端'],
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
