/**
 * DEV-Agent DevOps Agent
 *
 * 定义 DevOps Agent 配置 + 轻量健康检查服务。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'dev-devops',
  name: 'DevOps Agent',
  role: '运维专家 — Docker/K8s/CI-CD/部署',
  port: parseInt(process.env.AGENT_PORT || '8204'),
  skills: [
    'docker-management',
    'kubernetes-deployment',
    'ci-cd-pipeline',
    'monitoring-setup',
    'terraform-iac',
    'helm-charts',
    'ansible',
  ],
  tags: ['devops', 'docker', 'k8s', 'deploy', 'ci/cd', '运维'],
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
