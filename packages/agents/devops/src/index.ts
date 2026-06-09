/**
 * DEV-Agent DevOps Agent (Core Library 集成版)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAgentApp } from '@dev-agent/core';
import type { AgentFactoryConfig } from '@dev-agent/core';

const config: AgentFactoryConfig = {
  id: 'dev-devops',
  label: 'DevOps Agent',
  port: parseInt(process.env.AGENT_PORT || '8204'),
  hermesPort: parseInt(process.env.HERMES_PORT || '8204'),
  skills: [
    'docker-management',
    'kubernetes-deployment',
    'ci-cd-pipeline',
    'monitoring-setup',
    'terraform-iac',
    'helm-charts',
    'ansible',
    'pulumi',
    'argocd',
    'chaos-engineering',
    'service-mesh',
  ],
  tags: ['docker', 'k8s', 'kubernetes', 'deploy', 'ci/cd', 'devops', '运维'],
  peers: [
    { host: '127.0.0.1', port: 8201, id: 'dev-frontend' },
    { host: '127.0.0.1', port: 8202, id: 'dev-backend' },
    { host: '127.0.0.1', port: 8203, id: 'dev-testing' },
    { host: '127.0.0.1', port: 8205, id: 'dev-pm' },
  ],
  buildSystemPrompt() {
    return `你是 DevOps 专家，擅长 Docker/K8s/CI-CD/Terraform/监控。

技能：${config.skills.join('、')}

职责：提供专业的 DevOps 方案，简洁有力，突出重点。`;
  },
  loadSkillContent(skillName: string) {
    const skillPath = join(process.cwd(), '../../skills/devops', skillName, 'SKILL.md');
    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return '';
  },
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(process.cwd(), '../../skills/devops', skillName, 'SKILL.md');
  if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
  return '';
}

const { app, agentBus, sessionManager, memoryStore } = createAgentApp(config);

app.listen(config.port, async () => {
  console.log(`🚀 ${config.label} listening on port ${config.port}`);
  await agentBus.registry.registerWithPeers(config.peers);
});

process.on('SIGINT', () => { sessionManager.close(); memoryStore.close(); process.exit(0); });
process.on('SIGTERM', () => { sessionManager.close(); memoryStore.close(); process.exit(0); });
