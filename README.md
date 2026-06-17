# DEV-Agent-Teams

> 基于 @open-multi-agent/core 的多 Agent 协同开发系统

## 核心理念

```
@open-multi-agent/core（横向编排） × Hermes（垂类深度） = DEV-Agent-Teams（开发能力倍增）
```

DEV-Agent-Teams 使用 [@open-multi-agent/core](https://github.com/open-multi-agent/open-multi-agent) 作为编排框架，结合 Hermes 垂类 Agent，提供开箱即用的多 Agent 开发团队。

## 架构概述

```
用户请求 → Dashboard (Next.js :3000) → Gateway (:8400)
                                            │
                                   ┌────────┴────────┐
                                   │ TeamOrchestrator │ (@open-multi-agent/core)
                                   │ - runTeam()      │   自动任务分解 + DAG 执行
                                   │ - runAgent()     │   单 Agent 路由
                                   │ - SharedMemory   │   团队共享上下文
                                   │ - MessageBus     │   Agent 间通信
                                   │ - TaskQueue      │   任务依赖调度
                                   └────────┬────────┘
                                            │
        ┌──────────┬───────────┬────────────┼───────────┐
        ▼          ▼           ▼            ▼           ▼
   ┌────────┐ ┌────────┐ ┌──────────┐ ┌────────┐ ┌────────┐
   │Frontend│ │Backend │ │ Testing  │ │DevOps  │ │   PM   │
   │ Agent  │ │ Agent  │ │  Agent   │ │ Agent  │ │ Agent  │
   └────────┘ └────────┘ └──────────┘ └────────┘ └────────┘
        │          │           │            │           │
        └──────────┴───────────┴────────────┴───────────┘
                              │
                    ┌─────────┴─────────┐
                    │   @dev-agent/core  │
                    │   (HTTP API 层)    │
                    └───────────────────┘
```

## 项目结构

```
DEV-Agent-Teams/
├── packages/
│   ├── core/                        # @dev-agent/core 共享库
│   │   └── src/
│   │       ├── agent-factory.ts     # HTTP API 层（Express）
│   │       ├── session/             # SQLite 会话管理
│   │       └── team/
│   │           └── TeamOrchestrator.ts  # 核心编排器
│   ├── gateway/                     # Gateway 统一入口 (:8400)
│   │   └── src/
│   │       └── api-gateway.ts       # 薄代理，委托 TeamOrchestrator
│   ├── agents/                      # Agent 定义
│   │   ├── frontend/                # 前端开发 Agent
│   │   ├── backend/                 # 后端开发 Agent
│   │   ├── testing/                 # 测试开发 Agent
│   │   ├── devops/                  # DevOps Agent
│   │   └── pm/                      # 产品经理 Agent
│   └── dashboard/                   # Next.js 管理仪表盘 (:3000)
├── config/                          # 配置文件
├── scripts/                         # 启动 & 测试脚本
└── .env                             # 环境变量配置
```

## 快速开始

```bash
# 1. 配置环境变量
cp .env.example .env
# 编辑 .env，填入 MODEL_NAME、API_KEY、MODEL_BASE_URL 等

# 2. 安装依赖
pnpm install

# 3. 启动 Gateway
cd packages/gateway && pnpm dev

# 4. 启动 Dashboard
cd packages/dashboard && pnpm dev

# 5. 打开浏览器
open http://localhost:3000
```

## Agent 角色

| Agent | 职责 |
|-------|------|
| dev-frontend | React/Vue/TypeScript/组件开发 |
| dev-backend | Python/Node.js/Go/API 设计 |
| dev-testing | pytest/Jest/Playwright/覆盖率 |
| dev-devops | Docker/K8s/CI-CD/部署 |
| dev-pm | PRD/需求分析/用户故事 |

## 核心特性

### 多 Agent 协同编排
- `runTeam("开发量化交易系统")` — 协调员自动分解目标为任务 DAG，并行执行
- `runAgent("dev-frontend", "创建登录组件")` — 单 Agent 处理简单任务
- `runTasks([...])` — 显式任务列表，用户指定步骤和依赖

### Agent 间通信
- `MessageBus` — 消息传递（send/broadcast/subscribe）
- `SharedMemory` — 团队共享上下文
- `delegate_to_agent` — 内置工具（带循环检测 + 深度限制）

### 会话管理
- SQLite 持久化存储，支持多会话隔离
- 软删除机制，数据可追溯
- 会话级并发锁，防止竞态条件

### 容错机制
- 框架内置重试（指数退避）
- 循环检测（防止 Agent 死循环）
- Token 预算控制

### 仪表盘
- 实时 Agent 健康监控
- 多 Agent 并发对话
- 对话历史持久化
- 支持单 Agent 和团队协同两种模式

## 技术栈

| 层 | 技术 |
|----|------|
| 编排框架 | @open-multi-agent/core |
| Agent 运行时 | Node.js + Express + TypeScript |
| AI 模型 | MiMo / DeepSeek (OpenAI 兼容 API) |
| 前端 | Next.js 14 + React + Tailwind CSS |
| 数据库 | SQLite (better-sqlite3) |

## 测试

### 快速回归测试（3分钟）

```bash
bash scripts/quick-regression.sh
```

验证：Gateway 健康、5 Agent 在线、单 Agent 响应、Team 模式协同、Dashboard 集成。

### 完整回归测试（10分钟）

```bash
bash scripts/full-regression.sh
```

覆盖：健康检查、Agent 列表、单 Agent / Team / Meeting 三种模式、数据持久化、审计日志。

> 详细说明见 [REGRESSION-TEST.md](REGRESSION-TEST.md)

## 相关项目

- [@open-multi-agent/core](https://github.com/open-multi-agent/open-multi-agent) — 多 Agent 编排框架
- [Open-Agent-Teams](https://github.com/Jinchengawu/Open-Agent-Teams) — 抽象架构与集成规格

## 许可证

MIT License

---

**版本**：v0.3.0
**最后更新**：2026-06-17
