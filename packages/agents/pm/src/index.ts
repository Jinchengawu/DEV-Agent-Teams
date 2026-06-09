/**
 * DEV-Agent PM Agent (Core Library 集成版 + 工作流驱动)
 *
 * 产品经理 Agent：
 * - 需求分析和 PRD 编写
 * - 与用户确认需求后触发全流程开发流水线
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createAgentApp, WorkflowOrchestrator } from '@dev-agent/core';
import type { AgentFactoryConfig } from '@dev-agent/core';
import Database from 'better-sqlite3';
import os from 'node:os';
import path from 'node:path';

const config: AgentFactoryConfig = {
  id: 'dev-pm',
  label: '产品经理 Agent',
  port: parseInt(process.env.AGENT_PORT || '8205'),
  hermesPort: parseInt(process.env.HERMES_PORT || '8205'),
  skills: [
    'prd-writing',
    'user-story-mapping',
    'requirements-analysis',
    'competitor-analysis',
    'product-strategy',
    'user-research',
    'roadmap-planning',
    'data-analysis',
    'prototyping',
    'a-b-testing',
  ],
  tags: ['prd', 'requirement', 'product', 'strategy', 'user-story', 'pm', '产品', '需求', '用户研究'],
  peers: [
    { host: '127.0.0.1', port: 8201, id: 'dev-frontend' },
    { host: '127.0.0.1', port: 8202, id: 'dev-backend' },
    { host: '127.0.0.1', port: 8203, id: 'dev-testing' },
    { host: '127.0.0.1', port: 8204, id: 'dev-devops' },
  ],
  buildSystemPrompt() {
    return `你是产品经理专家，擅长需求分析/PRD编写/用户研究/产品策略。

技能：${config.skills.join('、')}

职责：提供专业的产品管理建议，简洁有力，突出重点。`;
  },
  loadSkillContent(skillName: string) {
    const skillPath = join(process.cwd(), '../../skills/pm', skillName, 'SKILL.md');
    if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
    return '';
  },
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(process.cwd(), '../../skills/pm', skillName, 'SKILL.md');
  if (existsSync(skillPath)) return readFileSync(skillPath, 'utf-8');
  return '';
}

const { app, agentBus, sessionManager, memoryStore, compressor } = createAgentApp(config);

// ── Workflow Orchestrator (PM-only) ──
const dataDir = process.env.AGENT_DB_PATH || path.join(os.homedir(), '.dev-agent/data');
const db = new Database(path.join(dataDir, 'pm.db'));
db.pragma('journal_mode = WAL');
const orchestrator = new WorkflowOrchestrator(db, agentBus, sessionManager);

// ── Workflow endpoints ──
app.get('/v1/workflows', (_req, res) => {
  const workflows = orchestrator.listWorkflows();
  res.json({ workflows });
});

app.get('/v1/workflows/:id', (req, res) => {
  const wf = orchestrator.getWorkflow(req.params.id);
  if (!wf) { res.status(404).json({ error: 'Workflow not found' }); return; }
  const steps = orchestrator.getWorkflowSteps(req.params.id);
  const template = orchestrator.getTemplate(wf.template);
  res.json({ workflow: wf, steps, template });
});

app.post('/v1/workflows', async (req, res) => {
  try {
    const { sessionId, templateId, userRequest } = req.body;
    if (!sessionId || !templateId || !userRequest) {
      res.status(400).json({ error: 'sessionId, templateId, userRequest required' });
      return;
    }
    const wf = await orchestrator.startWorkflow(sessionId, templateId, userRequest);
    res.json({ workflow: wf });
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'Unknown error' });
  }
});

app.get('/v1/templates', (_req, res) => {
  res.json({ templates: orchestrator.listTemplates() });
});

app.listen(config.port, async () => {
  console.log(`🚀 ${config.label} listening on port ${config.port}`);
  console.log(`🔄 Workflow Orchestrator enabled`);
  await agentBus.registry.registerWithPeers(config.peers);
});

process.on('SIGINT', () => { sessionManager.close(); memoryStore.close(); process.exit(0); });
process.on('SIGTERM', () => { sessionManager.close(); memoryStore.close(); process.exit(0); });
