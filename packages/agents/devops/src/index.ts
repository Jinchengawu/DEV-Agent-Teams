/**
 * DEV-Agent DevOps Agent
 * 
 * DevOps 专用 Agent：Docker/K8s/CI-CD/Monitoring
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
  id: 'dev-devops',
  label: 'DevOps Agent',
  port: parseInt(process.env.AGENT_PORT || '8204'),
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

const DEVOPS_KEYWORDS = [
  'docker', 'container', 'kubernetes', 'k8s', 'helm',
  'ci', 'cd', 'cicd', 'pipeline', 'github actions', 'gitlab ci',
  'terraform', 'pulumi', 'ansible', 'infrastructure',
  'monitoring', 'prometheus', 'grafana', 'logging',
  'deploy', 'deployment', 'devops', '运维', '部署', '容器',
];

function analyzeIntent(message: string): { matched: boolean; skills: string[] } {
  const lowerMessage = message.toLowerCase();
  const matchedSkills: string[] = [];
  
  for (const keyword of DEVOPS_KEYWORDS) {
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
    return `我是一个 DevOps Agent，专注于 Docker/K8s/CI-CD/Monitoring。

我可以帮你：
- 创建 Dockerfile 和 docker-compose
- 配置 Kubernetes 部署
- 设置 CI/CD 流水线
- 配置监控和告警
- 实现基础设施即代码

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
    return `根据你的 DevOps 需求，我可以应用以下技能：

${skillList}

请提供更多细节，我会为你生成相应的配置。`;
  }
  
  return `我理解你的 DevOps 需求。请告诉我具体需要：
1. 部署什么应用？
2. 使用什么技术栈？
3. 部署环境？`;
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
    
    const skillsDir = join(process.cwd(), '../../skills/devops');
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
