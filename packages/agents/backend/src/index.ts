/**
 * DEV-Agent Backend Agent
 * 
 * 后端开发专用 Agent：Python/Node.js/Go/API/Database
 */

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Configuration
// ============================================================================

const config: AgentConfig = {
  id: 'dev-backend',
  label: '后端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8202'),
  skills: [
    'python-development',
    'nodejs-development',
    'go-development',
    'rust-development',
    'api-design',
    'database-design',
    'grpc',
    'microservices',
  ],
};

// ============================================================================
// Skills Loader
// ============================================================================

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

// ============================================================================
// Intent Analysis
// ============================================================================

const BACKEND_KEYWORDS = [
  'python', 'node', 'nodejs', 'go', 'golang', 'rust', 'java', 'c#',
  'api', 'rest', 'graphql', 'grpc', 'endpoint',
  'database', 'sql', 'postgresql', 'mysql', 'mongodb', 'redis',
  'server', 'backend', 'microservice', 'serverless',
  '后端', '服务器', '接口', '数据库', '微服务',
];

function analyzeIntent(message: string): { matched: boolean; skills: string[] } {
  const lowerMessage = message.toLowerCase();
  const matchedSkills: string[] = [];
  
  for (const keyword of BACKEND_KEYWORDS) {
    if (lowerMessage.includes(keyword.toLowerCase())) {
      matchedSkills.push(keyword);
    }
  }
  
  return {
    matched: matchedSkills.length > 0,
    skills: matchedSkills,
  };
}

// ============================================================================
// Response Generator
// ============================================================================

function generateResponse(message: string, skills: Map<string, Skill>): string {
  const intent = analyzeIntent(message);
  
  if (!intent.matched) {
    return `我是一个后端开发 Agent，专注于 Python/Node.js/Go/API/Database 开发。

我可以帮你：
- 创建 RESTful API
- 设计数据库 Schema
- 实现业务逻辑
- 配置认证授权
- 优化性能

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
    return `根据你的需求，我可以应用以下技能：

${skillList}

请提供更多细节，我会为你生成相应的代码。`;
  }
  
  return `我理解你的后端开发需求。请告诉我具体需要：
1. 创建什么 API？
2. 使用什么技术栈？
3. 数据库设计需求？`;
}

// ============================================================================
// Express Server
// ============================================================================

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
    
    const skillsDir = join(process.cwd(), '../../skills/backend');
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
