/**
 * DEV-Agent Backend Agent (Core Library 集成版)
 *
 * 后端开发专用 Agent：
 * - 会话持久化 (SQLite)
 * - 上下文压缩
 * - Agent 间通信 (AgentBus)
 * - 工作流支持 (WorkflowOrchestrator)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAgentApp } from '@dev-agent/core';
import type { AgentFactoryConfig } from '@dev-agent/core';

const config: AgentFactoryConfig = {
  id: 'dev-backend',
  label: '后端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8202'),
  hermesPort: parseInt(process.env.HERMES_PORT || '8202'),
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
  peers: [
    { host: '127.0.0.1', port: 8201, id: 'dev-frontend' },
    { host: '127.0.0.1', port: 8203, id: 'dev-testing' },
    { host: '127.0.0.1', port: 8204, id: 'dev-devops' },
    { host: '127.0.0.1', port: 8205, id: 'dev-pm' },
  ],
  buildSystemPrompt() {
    const skills = config.skills
      .map((skill) => {
        const content = loadSkillContent(skill);
        return `## ${skill}\n${content.substring(0, 500)}...`;
      })
      .join('\n\n');

    return `你是一个专业的后端开发 Agent，专注于 Python、Node.js、Go、Rust、API 设计、数据库开发。

你的技能包括：
${config.skills.map((s) => `- ${s}`).join('\n')}

技能详情：
${skills}

请根据用户的需求，提供专业的后端开发建议和代码示例。`;
  },

  loadSkillContent(skillName: string) {
    const skillPath = join(
      process.cwd(),
      '../../skills/backend',
      skillName,
      'SKILL.md'
    );
    if (existsSync(skillPath)) {
      return readFileSync(skillPath, 'utf-8');
    }
    return '';
  },
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(
    process.cwd(),
    '../../skills/backend',
    skillName,
    'SKILL.md'
  );
  if (existsSync(skillPath)) {
    return readFileSync(skillPath, 'utf-8');
  }
  return '';
}

const { app, agentBus, sessionManager, memoryStore, compressor } =
  createAgentApp(config);

app.listen(config.port, async () => {
  console.log(`🚀 ${config.label} listening on port ${config.port}`);
  console.log(`🔗 Hermes integration: http://127.0.0.1:${config.hermesPort}`);
  console.log(`📋 Skills: ${config.skills.join(', ')}`);
  console.log(
    `💾 Database: ${process.env.AGENT_DB_PATH || '~/.dev-agent/data'}`
  );

  // Phase B1: Register with peers on startup
  const registered = await agentBus.registry.registerWithPeers(config.peers);
  console.log(
    `🤝 Peers: ${registered}/${config.peers.length} registered (${agentBus.registry.getAllAgents().length} total including self)`
  );
});

process.on('SIGINT', () => {
  sessionManager.close();
  memoryStore.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  sessionManager.close();
  memoryStore.close();
  process.exit(0);
});
