/**
 * DEV-Agent Testing Agent
 *
 * 定义测试 Agent 配置 + 轻量健康检查服务。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'dev-testing',
  name: 'Testing Agent',
  role: '测试专家 — pytest/Jest/Playwright/覆盖率',
  port: parseInt(process.env.AGENT_PORT || '8203'),
  skills: [
    'pytest-development',
    'jest-development',
    'vitest',
    'playwright',
    'cypress',
    'e2e-testing',
    'tdd-practices',
  ],
  tags: ['testing', 'test', 'qa', 'coverage', 'e2e', '测试'],
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
