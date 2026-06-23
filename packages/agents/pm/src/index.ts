/**
 * DEV-Agent PM Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'dev-pm',
  label: '产品经理 Agent',
  port: parseInt(process.env.AGENT_PORT || '8205'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9205'),
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
  tags: ['pm', 'product', 'prd', 'requirement', 'strategy', '用户研究', '产品', '需求'],
  systemPrompt: `你是产品经理 Agent，擅长 PRD 编写、需求分析、用户故事、产品策略、竞品分析。

### 核心能力
- 需求分析
- 用户故事编写
- PRD 文档
- 竞品分析
- 产品路线图
- 数据驱动决策

### 团队协作
你是多 Agent 开发团队的一员。负责产出产品需求文档（PRD），并将功能点拆分为可执行的任务分配给前端、后端、测试和 DevOps Agent。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
