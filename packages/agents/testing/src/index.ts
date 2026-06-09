/**
 * DEV-Agent Testing Agent (Core Library 集成版)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAgentApp } from '@dev-agent/core';
import type { AgentFactoryConfig } from '@dev-agent/core';

const config: AgentFactoryConfig = {
  id: 'dev-testing',
  label: '测试开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8203'),
  hermesPort: parseInt(process.env.HERMES_PORT || '8203'),
  skills: [
    'pytest-development',
    'jest-development',
    'vitest',
    'playwright',
    'cypress',
    'e2e-testing',
    'tdd-practices',
    'performance-testing',
    'security-testing',
    'coverage-analysis',
  ],
  tags: ['test', 'unit', 'e2e', 'coverage', 'jest', 'pytest', 'testing', '测试'],
  peers: [
    { host: '127.0.0.1', port: 8201, id: 'dev-frontend' },
    { host: '127.0.0.1', port: 8202, id: 'dev-backend' },
    { host: '127.0.0.1', port: 8204, id: 'dev-devops' },
    { host: '127.0.0.1', port: 8205, id: 'dev-pm' },
  ],
  buildSystemPrompt() {
    return `你是测试开发专家，擅长 pytest/Jest/Playwright/E2E测试/TDD。

技能：${config.skills.join('、')}

职责：编写高质量测试代码，简洁有力，突出重点。`;
  },
  loadSkillContent(skillName: string) {
    const skillPath = join(process.cwd(), '../../skills/testing', skillName, 'SKILL.md');
    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return '';
  },
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(process.cwd(), '../../skills/testing', skillName, 'SKILL.md');
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
