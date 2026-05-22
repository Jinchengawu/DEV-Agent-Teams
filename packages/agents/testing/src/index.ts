/**
 * DEV-Agent Testing Agent
 * 
 * 测试开发专用 Agent：pytest/Jest/Playwright/Cypress
 */

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

interface AgentConfig {
  id: string;
  label: string;
  port: number;
  skills: string[];
}

interface Skill {
  name: string;
  description: string;
  content: string;
}

const config: AgentConfig = {
  id: 'dev-testing',
  label: '测试开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8203'),
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
};

function loadSkills(skillsDir: string): Map<string, Skill> {
  const skills = new Map<string, Skill>();
  
  for (const skillName of config.skills) {
    const skillPath = join(skillsDir, skillName, 'SKILL.md');
    
    if (existsSync(skillPath)) {
      const content = readFileSync(skillPath, 'utf-8');
      
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let description = '';
      
      if (frontmatterMatch) {
        const frontmatter = frontmatterMatch[1];
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch) {
          description = descMatch[1].trim();
        }
      }
      
      skills.set(skillName, {
        name: skillName,
        description,
        content,
      });
    }
  }
  
  return skills;
}

const TESTING_KEYWORDS = [
  'test', 'testing', 'unit', 'e2e', 'integration', 'coverage',
  'jest', 'pytest', 'vitest', 'playwright', 'cypress', 'selenium',
  'mock', 'stub', 'assert', 'expect',
  '测试', '单元测试', '集成测试', '覆盖率', '自动化',
];

function analyzeIntent(message: string): { matched: boolean; skills: string[] } {
  const lowerMessage = message.toLowerCase();
  const matchedSkills: string[] = [];
  
  for (const keyword of TESTING_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      matchedSkills.push(keyword);
    }
  }
  
  return {
    matched: matchedSkills.length > 0,
    skills: matchedSkills,
  };
}

function generateResponse(message: string, skills: Map<string, Skill>): string {
  const intent = analyzeIntent(message);
  
  if (!intent.matched) {
    return `我是一个测试开发 Agent，专注于 pytest/Jest/Playwright/Cypress 测试。

我可以帮你：
- 编写单元测试
- 创建集成测试
- 设计 E2E 测试
- 分析测试覆盖率
- 实现 TDD 流程

请告诉我你需要什么帮助？`;
  }
  
  const relevantSkills = Array.from(skills.values())
    .filter(skill => 
      intent.skills.some(keyword => 
        skill.name.toLowerCase().includes(keyword) ||
        skill.description.toLowerCase().includes(keyword)
      )
    );
  
  if (relevantSkills.length > 0) {
    const skillList = relevantSkills.map(s => `- ${s.name}: ${s.description}`).join('\n');
    return `根据你的测试需求，我可以应用以下技能：

${skillList}

请提供更多细节，我会为你生成相应的测试代码。`;
  }
  
  return `我理解你的测试需求。请告诉我具体需要：
1. 测试什么功能？
2. 使用什么测试框架？
3. 测试类型（单元/集成/E2E）？`;
}

const app = express();
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: config.id,
    label: config.label,
    skills: config.skills.length,
  });
});

app.post('/v1/chat/completions', (req, res) => {
  try {
    const { messages } = req.body;
    const userMessage = messages?.[0]?.content || '';
    
    const skillsDir = join(process.cwd(), '../../skills/testing');
    const skills = loadSkills(skillsDir);
    
    const content = generateResponse(userMessage, skills);
    
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
  console.log(`📋 Skills: ${config.skills.join(', ')}`);
});
