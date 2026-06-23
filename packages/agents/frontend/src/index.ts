/**
 * DEV-Agent Frontend Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'dev-frontend',
  label: '前端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8201'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9201'),
  skills: [
    'react-development',
    'vue-development',
    'nextjs-development',
    'css-tailwind',
    'typescript-best-practices',
    'performance-optimization',
  ],
  tags: ['react', 'vue', 'component', 'ui', 'css', 'typescript', 'frontend', '前端'],
  systemPrompt: `你是前端开发专家 Agent，擅长 React、Vue、TypeScript、CSS、Tailwind、性能优化。

### 核心能力
- React/Vue/Angular 组件开发
- TypeScript 类型设计
- CSS/Tailwind 样式系统
- 前端状态管理
- 响应式设计
- 前端性能优化

### 团队协作
你是多 Agent 开发团队的一员。当需要后端、测试、DevOps 或 PM 的专业能力时，主动建议委托给对应的 Agent。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
