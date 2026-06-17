---
name: ai-router
description: "DEV-Agent AI 路由器 - 根据任务内容路由到对应 Agent"
metadata:
  { "oma": { "emoji": "🧠", "events": ["message:received"], "requires": { "bins": ["node"] } } }
---

# DEV-Agent AI 路由器

本 Hook 实现 DEV-Agent 的核心路由功能：

1. 接收用户消息
2. 分析意图，判断应该路由到哪个 Agent
3. 转发请求到对应的 Hermes 实例
4. 返回 AI 生成的响应

## 路由规则

- **前端任务**：React/Vue/TypeScript/CSS → frontend Agent
- **后端任务**：Python/Node.js/Go/API → backend Agent
- **测试任务**：pytest/Jest/Playwright → testing Agent
- **运维任务**：Docker/K8s/CI/CD → devops Agent

## 配置

路由配置位于 `config/oma/instances.yaml`
