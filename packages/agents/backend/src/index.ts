/**
 * DEV-Agent Backend Agent — 完整版
 *
 * 基于 @open-agent-teams/core 的 createAgentApp 构建完整 Agent 服务，
 * 包含：/health、/v1/chat/completions、/v1/sessions、/agent/message 等端点
 */

import { createAgentApp } from '@open-agent-teams/core';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const AGENT_PORT = parseInt(process.env.AGENT_PORT || '8202');
const HERMES_PORT = parseInt(process.env.HERMES_PORT || '9202');

const agentConfig = {
  id: 'dev-backend',
  label: '后端开发 Agent',
  port: AGENT_PORT,
  hermesPort: HERMES_PORT,
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
  buildSystemPrompt: () => {
    return `你是后端开发专家 Agent，擅长 Python、Node.js、Go、数据库设计、API 设计、微服务架构。

### 核心能力
- 后端架构设计与代码实现
- 数据库设计与优化
- API 设计与文档编写
- 代码审查与性能优化
- 测试驱动开发

### 团队协作
你是多 Agent 开发团队的一员。当需要前端、测试、DevOps 或 PM 的专业能力时，主动建议委托给对应的 Agent。

当前时间：${new Date().toISOString()}`;
  },
  loadSkillContent: (skillName: string) => {
    const skillPath = join(__dirname, '..', 'skills', `${skillName}.md`);
    if (existsSync(skillPath)) {
      return readFileSync(skillPath, 'utf-8');
    }
    return `// Skill: ${skillName}\n// 未找到技能文件`;
  },
};

const { app } = createAgentApp(agentConfig);

app.listen(AGENT_PORT, () => {
  console.log(`🚀 Backend Agent 就绪 → http://127.0.0.1:${AGENT_PORT}`);
  console.log(`   Agent ID: ${agentConfig.id}`);
  console.log(`   Hermes Port: ${HERMES_PORT}`);
  console.log(`   Tags: ${agentConfig.tags.join(', ')}`);
});

process.on('SIGINT', () => {
  console.log('\n👋 Backend Agent 关闭');
  process.exit(0);
});
process.on('SIGTERM', () => process.exit(0));
