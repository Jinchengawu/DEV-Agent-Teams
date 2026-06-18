/**
 * Project Admin Agent
 *
 * 项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调。
 * 实际编排由 Gateway 的 TeamOrchestrator 内嵌处理。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'project-admin',
  name: 'Project Admin',
  role: '项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调。擅长：看板管理、里程碑规划、进度监控、风险识别、跨 Agent 任务协调。',
  port: parseInt(process.env.AGENT_PORT || '8206'),
  skills: [
    'project-management',
    'task-assignment',
    'milestone-tracking',
    'progress-reporting',
    'agent-coordination',
    'kanban-management',
    'risk-identification',
    'deadline-monitoring',
  ],
  tags: [
    'project', 'admin', 'kanban', 'milestone', 'progress',
    'task', 'pm', '管理', '进度', '里程碑', '协调', '分配',
  ],
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
