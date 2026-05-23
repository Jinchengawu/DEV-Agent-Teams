/**
 * DEV-Agent Frontend Agent (Core Library 集成版)
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAgentApp } from '@dev-agent/core';
import type { AgentFactoryConfig } from '@dev-agent/core';

const config: AgentFactoryConfig = {
  id: 'dev-frontend',
  label: '前端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8201'),
  hermesPort: parseInt(process.env.HERMES_PORT || '8201'),
  skills: [
    'react-development',
    'vue-development',
    'nextjs-development',
    'css-tailwind',
    'typescript-best-practices',
    'performance-optimization',
  ],
  tags: ['react', 'vue', 'component', 'ui', 'css', 'typescript', 'frontend', '前端'],
  peers: [
    { host: '127.0.0.1', port: 8202, id: 'dev-backend' },
    { host: '127.0.0.1', port: 8203, id: 'dev-testing' },
    { host: '127.0.0.1', port: 8204, id: 'dev-devops' },
    { host: '127.0.0.1', port: 8205, id: 'dev-pm' },
  ],
  buildSystemPrompt() {
    const skills = config.skills.map((skill) => {
      const content = loadSkillContent(skill);
      return `## ${skill}\n${content.substring(0, 500)}...`;
    }).join('\n\n');
    return `你是一个专业的前端开发 Agent，专注于 React、Vue、TypeScript、CSS、性能优化。\n\n你的技能包括：\n${config.skills.map((s) => `- ${s}`).join('\n')}\n\n技能详情：\n${skills}\n\n请根据用户的需求，提供专业的前端开发建议和代码示例。`;
  },
  loadSkillContent(skillName: string) {
    const skillPath = join(process.cwd(), '../../skills/frontend', skillName, 'SKILL.md');
    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return '';
  },
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(process.cwd(), '../../skills/frontend', skillName, 'SKILL.md');
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
