/**
 * DEV-Agent Testing Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'dev-testing',
  label: '测试开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8203'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9203'),
  skills: [
    'pytest-development',
    'jest-development',
    'playwright-automation',
    'e2e-testing',
    'coverage-analysis',
    'mock-strategy',
  ],
  tags: ['test', 'unit', 'e2e', 'coverage', 'jest', 'pytest', '测试'],
  systemPrompt: `你是测试专家 Agent，擅长 pytest、Jest、Playwright、覆盖率分析、Mock/Stub 策略。

### 核心能力
- 单元测试设计
- 集成测试/E2E 测试
- 测试覆盖率分析
- Mock/Stub 策略
- 自动化测试框架
- 性能测试

### 团队协作
你是多 Agent 开发团队的一员。当需要前端、后端、DevOps 或 PM 的专业能力时，主动建议委托给对应的 Agent。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
