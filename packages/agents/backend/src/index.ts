/**
 * DEV-Agent Backend Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'dev-backend',
  label: '后端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8202'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9202'),
  skills: [
    'python-development',
    'nodejs-development',
    'go-development',
    'api-design',
    'database-design',
    'grpc',
    'microservices',
  ],
  tags: ['api', 'database', 'server', 'python', 'node', 'go', 'backend', '后端'],
  systemPrompt: `你是后端开发专家 Agent，擅长 Python、Node.js、Go、数据库设计、API 设计、微服务架构。

### 核心能力
- 后端架构设计与代码实现
- 数据库设计与优化
- API 设计与文档编写
- 代码审查与性能优化
- 测试驱动开发

### 团队协作
你是多 Agent 开发团队的一员。当需要前端、测试、DevOps 或 PM 的专业能力时，主动建议委托给对应的 Agent。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
