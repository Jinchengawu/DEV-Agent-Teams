# DEV-Agent

> 基于 AI-local-OS 架构的开发者多 Agent 协同系统

## 核心理念

```
OpenClaw（横向编排） × Hermes（垂类深度） = DEV-Agent（开发能力倍增）
```

## 架构概述

DEV-Agent 完全基于 AI-local-OS 架构，复用 OpenClaw 编排内核和 Hermes 垂类 Agent：

```
用户请求 → OpenClaw 内核 → 意图分析 → Agent 路由
                │
    ┌───────────┼───────────┬───────────┐
    │           │           │           │
    ▼           ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│frontend│ │backend │ │testing │ │devops  │
│Hermes  │ │Hermes  │ │Hermes  │ │Hermes  │
│ :8201  │ │ :8202  │ │ :8203  │ │ :8204  │
└────────┘ └────────┘ └────────┘ └────────┘
```

## 项目结构

```
DEV-Agent/
├── README.md
├── config/
│   └── openclaw/
│       └── instances.yaml        # Agent 实例配置
├── plugins/
│   └── ai-router/                # OpenClaw AI 路由插件
│       ├── HOOK.md
│       └── handler.ts
├── packages/
│   ├── agents/                   # Agent 服务
│   │   ├── frontend/             # 前端 Agent
│   │   ├── backend/              # 后端 Agent
│   │   ├── testing/              # 测试 Agent
│   │   └── devops/               # DevOps Agent
│   └── openclaw/                 # OpenClaw 集成包
├── scripts/
│   ├── start-openclaw.sh         # OpenClaw 启动脚本
│   └── test-routing.sh           # 路由测试
├── skills/                       # Agent 技能
│   ├── frontend/                 # 前端技能（9 个）
│   ├── backend/                  # 后端技能（9 个）
│   ├── testing/                  # 测试技能（10 个）
│   └── devops/                   # DevOps 技能（10 个）
├── templates/                    # 项目模板
└── examples/                     # 示例项目
```

## 快速开始

```bash
# 1. 启动 OpenClaw + Hermes + Agent
./scripts/start-openclaw.sh

# 2. 测试路由
openclaw agent --local -m "帮我创建 React 组件"
```

## Agent 角色

| Agent | 端口 | 职责 | 技能 |
|-------|------|------|------|
| frontend | 8201 | React/Vue/TypeScript | 9 个技能 |
| backend | 8202 | Python/Node.js/Go | 9 个技能 |
| testing | 8203 | pytest/Jest/Playwright | 10 个技能 |
| devops | 8204 | Docker/K8s/CI-CD | 10 个技能 |

## 路由规则

| 任务类型 | 关键词 | 目标 Agent |
|---------|--------|-----------|
| 前端开发 | React, Vue, 组件, UI | frontend |
| 后端开发 | API, 数据库, 服务器 | backend |
| 测试 | 测试, 单元测试, E2E | testing |
| 运维 | Docker, K8s, CI/CD | devops |

## 配置

Agent 实例配置位于 `config/openclaw/instances.yaml`

## 相关项目

- [AI-local-OS](https://github.com/Jinchengawu/AI-local-OS) - 基础架构
- [OpenClaw](https://github.com/openclaw) - 多 Agent 编排框架
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - Agent 运行时

## 许可证

MIT License

---

**版本**：v0.1.0  
**最后更新**：2026-05-21
