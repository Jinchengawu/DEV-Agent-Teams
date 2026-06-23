/**
 * DEV-Agent DevOps Agent — 统一工厂模式
 *
 * 使用 packages/agents/shared/agent-server.ts 创建标准化的 Agent 服务。
 */

import { startAgent } from '../../shared/agent-server.js';

const agentConfig = {
  id: 'dev-devops',
  label: 'DevOps Agent',
  port: parseInt(process.env.AGENT_PORT || '8204'),
  hermesPort: parseInt(process.env.HERMES_PORT || '9204'),
  skills: [
    'docker-containerization',
    'kubernetes-orchestration',
    'ci-cd-pipeline',
    'cloud-deployment',
    'monitoring-logging',
    'infrastructure-as-code',
  ],
  tags: ['docker', 'k8s', 'deploy', 'ci/cd', 'devops', '运维'],
  systemPrompt: `你是 DevOps 专家 Agent，擅长 Docker、Kubernetes、CI/CD、部署、监控、基础设施即代码。

### 核心能力
- Docker 容器化
- Kubernetes 编排
- CI/CD 流水线
- 云平台部署
- 监控与日志
- 基础设施即代码

### 团队协作
你是多 Agent 开发团队的一员。当需要前端、后端、测试或 PM 的专业能力时，主动建议委托给对应的 Agent。

当前时间：${new Date().toISOString()}`,
};

startAgent(agentConfig);
