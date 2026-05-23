/**
 * DEV-Agent PM Agent (Hermes 集成版)
 *
 * 产品经理专用 Agent：通过 Hermes 实现真正的 AI 能力
 */

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface AgentConfig {
  id: string;
  label: string;
  port: number;
  hermesPort: number;
  skills: string[];
}

const config: AgentConfig = {
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
};

function loadSkillContent(skillName: string): string {
  const skillPath = join(process.cwd(), '../../skills/pm', skillName, 'SKILL.md');

  if (existsSync(skillPath)) {
    return readFileSync(skillPath, 'utf-8');
  }

  return '';
}

function buildSystemPrompt(): string {
  const skills = config.skills.map(skill => {
    const content = loadSkillContent(skill);
    return `## ${skill}\n${content.substring(0, 500)}...`;
  }).join('\n\n');

  return `你是一个专业的产品经理 Agent，专注于产品需求分析、PRD 编写、用户研究、产品策略制定。

你的技能包括：
${config.skills.map(s => `- ${s}`).join('\n')}

技能详情：
${skills}

请根据用户的需求，提供专业的产品管理建议，包括但不限于 PRD 文档、用户故事、需求分析、竞品分析、产品路线图等。`;
}

async function callHermes(message: string): Promise<string> {
  try {
    const response = await fetch(`http://127.0.0.1:${config.hermesPort}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'hermes-agent',
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: message }
        ],
        max_tokens: 2000,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (response.ok) {
      const data = await response.json() as any;
      return data.choices?.[0]?.message?.content || '无法生成响应';
    }

    return `Hermes 调用失败: ${response.status}`;
  } catch (error) {
    return `Hermes 连接失败: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: config.id,
    label: config.label,
    hermesPort: config.hermesPort,
    skills: config.skills.length,
  });
});

app.post('/v1/chat/completions', async (req, res) => {
  try {
    const { messages } = req.body;
    const userMessage = messages?.[0]?.content || '';

    const content = await callHermes(userMessage);

    res.json({
      id: `chatcmpl-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: config.id,
      choices: [{
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop',
      }],
      usage: {
        prompt_tokens: userMessage.length,
        completion_tokens: content.length,
        total_tokens: userMessage.length + content.length,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(config.port, () => {
  console.log(`🚀 ${config.label} listening on port ${config.port}`);
  console.log(`🔗 Hermes integration: http://127.0.0.1:${config.hermesPort}`);
  console.log(`📋 Skills: ${config.skills.join(', ')}`);
});
