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
    const skills = config.skills.map((skill) => {
      const content = loadSkillContent(skill);
      return `## ${skill}\n${content.substring(0, 500)}...`;
    }).join('\n\n');
    return `你是一个专业的测试开发 Agent，专注于 pytest、Jest、Playwright、E2E 测试、TDD。\n\n你的技能包括：\n${config.skills.map((s) => `- ${s}`).join('\n')}\n\n技能详情：\n${skills}\n\n请根据用户的需求，编写高质量的测试代码。`;
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
