/**
 * DEV-Agent Frontend Agent
 * 
 * 前端开发专用 Agent：React/Vue/TypeScript/CSS
 */

import express from 'express';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';

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
  id: 'dev-frontend',
  label: '前端开发 Agent',
  port: parseInt(process.env.AGENT_PORT || '8201'),
  skills: [
    'react-development',
    'vue-development',
    'nextjs-development',
    'css-tailwind',
    'typescript-best-practices',
    'performance-optimization',
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
      
      // 解析 frontmatter
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

const FRONTEND_KEYWORDS = [
  'react', 'vue', 'angular', 'svelte', 'nextjs', 'nuxt',
  'component', 'ui', 'ux', 'css', 'tailwind', 'sass',
  'typescript', 'javascript', 'jsx', 'tsx',
  'frontend', '前端', '界面', '组件', '样式',
];

function analyzeIntent(message: string): { matched: boolean; skills: string[] } {
  const lowerMessage = message.toLowerCase();
  const matchedSkills: string[] = [];
  
  for (const keyword of FRONTEND_KEYWORDS) {
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
    return `我是一个前端开发 Agent，专注于 React/Vue/TypeScript/CSS 开发。

我可以帮你：
- 创建 React/Vue 组件
- 设计 UI/UX
- 编写 TypeScript 类型
- 优化 CSS 样式
- 性能优化

请告诉我你需要什么帮助？`;
  }
  
  // 根据匹配的技能生成响应
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
  
  return `我理解你的前端开发需求。请告诉我具体需要：
1. 创建什么组件？
2. 使用什么技术栈？
3. 有什么特殊要求？`;
}

// ============================================================================
// Express Server
// ============================================================================

const app = express();
app.use(express.json());

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: config.id,
    label: config.label,
    skills: config.skills.length,
  });
});

// 聊天补全
app.post('/v1/chat/completions', (req, res) => {
  try {
    const { messages } = req.body;
    const userMessage = messages?.[0]?.content || '';
    
    // 加载技能
    const skillsDir = join(process.cwd(), '../../skills/frontend');
    const skills = loadSkills(skillsDir);
    
    // 生成响应
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

// ============================================================================
// Start Server
// ============================================================================

app.listen(config.port, () => {
  console.log(`🚀 ${config.label} listening on port ${config.port}`);
  console.log(`📋 Skills: ${config.skills.join(', ')}`);
});
