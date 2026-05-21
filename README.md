# DEV-Agent

> 基于 AI-local-OS 架构的开发者多 Agent 协同系统

## 项目定位

DEV-Agent 是一个专为软件开发者设计的多 Agent 协同系统，将不同开发角色（前端、后端、测试、DevOps）拆分为独立的 Agent 实例，通过智能路由实现任务自动分发。

## 核心架构

```
用户请求 → DEV Gateway → 角色路由 → 专用 Agent → 结果聚合
                │
                ├── 前端 Agent (React/Vue/TypeScript)
                ├── 后端 Agent (Python/Node.js/Go)
                ├── 测试 Agent (单元/集成/E2E)
                └── DevOps Agent (CI/CD/Docker/K8s)
```

## 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 编排内核 | AI-local-OS Gateway | 统一路由、鉴权、限流 |
| Agent 运行时 | Hermes Agent | 垂类深度执行 |
| 前端 Agent | React/Vue/TypeScript | 前端开发专用 |
| 后端 Agent | Python/Node.js/Go | 后端开发专用 |
| 测试 Agent | pytest/Jest/Vitest | 测试专用 |
| DevOps Agent | Docker/K8s/Terraform | 运维专用 |

## 快速开始

```bash
# 1. 克隆仓库
git clone https://github.com/Jinchengawu/DEV-Agent.git
cd DEV-Agent

# 2. 启动所有 Agent
./scripts/start-all.sh

# 3. 测试路由
./scripts/test-routing.sh
```

## Agent 角色

### 前端 Agent

**职责**：
- React/Vue 组件开发
- TypeScript 类型定义
- UI/UX 实现
- 样式优化（Tailwind/CSS）

**技能**：
- 组件架构设计
- 状态管理（Redux/Zustand）
- 路由配置
- 性能优化

### 后端 Agent

**职责**：
- API 设计与实现
- 数据库设计与优化
- 业务逻辑开发
- 安全防护

**技能**：
- RESTful/GraphQL API
- ORM（Prisma/SQLAlchemy）
- 认证授权
- 缓存策略

### 测试 Agent

**职责**：
- 单元测试编写
- 集成测试设计
- E2E 测试自动化
- 代码覆盖率分析

**技能**：
- TDD/BDD 实践
- Mock/Stub 技术
- 测试数据管理
- CI 集成

### DevOps Agent

**职责**：
- CI/CD 流水线
- Docker 容器化
- K8s 编排部署
- 监控告警

**技能**：
- GitHub Actions
- Docker Compose
- Helm Charts
- Prometheus/Grafana

## 路由规则

| 任务类型 | 关键词 | 目标 Agent |
|---------|--------|-----------|
| 前端开发 | React, Vue, 组件, UI, CSS | frontend |
| 后端开发 | API, 数据库, 服务器, 接口 | backend |
| 测试 | 测试, 单元测试, E2E, 覆盖率 | testing |
| 运维 | Docker, K8s, CI/CD, 部署 | devops |
| 通用 | 代码, 调试, 重构 | 内核 |

## 项目结构

```
DEV-Agent/
├── README.md
├── docs/
│   ├── specs/           # 规格文档
│   └── plans/           # 实现计划
├── packages/
│   ├── gateway/         # 网关服务
│   └── agents/          # Agent 实现
│       ├── frontend/    # 前端 Agent
│       ├── backend/     # 后端 Agent
│       ├── testing/     # 测试 Agent
│       └── devops/      # DevOps Agent
├── config/              # 配置文件
└── scripts/             # 脚本工具
```

## 相关项目

- [AI-local-OS](https://github.com/Jinchengawu/AI-local-OS) - 基础架构
- [Hermes Agent](https://github.com/NousResearch/hermes-agent) - Agent 运行时

## 许可证

MIT License

---

**版本**：v0.1.0  
**最后更新**：2026-05-21
