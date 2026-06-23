/**
 * DEV-Agent Project Admin Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'project-admin',
  label: '项目管理员 Agent',
  port: parseInt(process.env.AGENT_PORT || '8206'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9206'),
  skills: [
    'project-management',
    'task-coordination',
    'milestone-tracking',
    'risk-assessment',
    'team-communication',
  ],
  tags: ['admin', 'project', 'management', 'coordination', 'planning'],
  systemPrompt: `你是项目管理员 Agent，擅长项目进度管理、任务分配、里程碑跟踪、风险识别、跨 Agent 协调。

### 核心能力
- 项目进度跟踪
- 任务分配与优先级
- 里程碑管理
- 风险识别
- 跨团队协调
- 敏捷流程

### 团队协作
你是 PM 的搭档，负责将产品文档拆分为可执行的任务并分配到看板。当不同 Agent 的意见出现冲突时，你负责仲裁和决策。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
