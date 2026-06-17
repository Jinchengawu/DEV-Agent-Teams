# Open-Agent-Teams 项目架构分析与改进路线图（更新版）

> 生成时间：2026-06-17
> 基于：DEV-Agent-Teams v0.3.0（已更新实现）+ Open-Agent-Teams（抽象架构层）+ 思维导图
> 更新说明：根据 DEV-Agent-Teams 最新代码状态重新评估，标记已实现/待实现/需修正项

---

## 一、项目定位（一句话）

**Open-Agent-Teams = @open-multi-agent/core（横向编排）× Hermes Agent（垂类深度）在开发场景下的生产级整合方案。**

- **不做** 编排引擎（交给 OMA）
- **不做** 单 Agent 运行时（交给 Hermes）
- **做** 的是：让多个 Hermes Profile 实例像开发团队一样协作，提供开箱即用的开发团队模板

---

## 二、当前架构总览（已更新）

### 2.1 架构公式

```
┌─────────────────────────────────────────────────────────────┐
│                    Open-Agent-Teams                          │
│         （抽象架构层 + 集成规格 + 技能包 + 实例模板）            │
├─────────────────────────────────────────────────────────────┤
│  横向编排层                    │  垂类深度层                 │
│  @open-multi-agent/core        │  Hermes Agent (Nous Research)│
│  - Goal-first 自动DAG分解       │  - Profile 多实例隔离         │
│  - 3运行时依赖                  │  - 三层记忆架构              │
│  - 12+模型提供商                │  - 自进化学习闭环            │
│  - Plan-only / 模型路由         │  - 40+内置工具               │
│  - onTrace / Dashboard          │  - SQLite FTS5 跨会话召回    │
│                                │  - agentskills.io 标准       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEV-Agent-Teams (v0.3.0)                  │
│              （开发场景具体实现 + Next.js Dashboard）         │
│                                                              │
│  已实现：                                                     │
│  ✅ Gateway (:8400) — Express 薄代理                         │
│  ✅ Dashboard (:3000) — Next.js 14 + Tailwind               │
│  ✅ TeamOrchestrator — @open-multi-agent/core 封装          │
│  ✅ 5个 Agent 定义（frontend/backend/testing/devops/pm）      │
│  ✅ SQLite 会话管理（多会话隔离、软删除、并发锁）             │
│  ✅ 上下文压缩器（token估算、自动摘要）                       │
│  ✅ Agent 间通信总线（MessageBus）                           │
│  ✅ 工作流编排（内置模板）                                    │
│  ✅ 容错机制（重试、循环检测、Token预算）                     │
│                                                              │
│  待实现/待明确：                                               │
│  ⏳ Hermes Profile 多实例生命周期管理                        │
│  ⏳ 胶水层（Glue Service）— 薄/厚胶水路由                     │
│  ⏳ 场景化记忆分层（项目锚定 / 协作会话 / Agent个体）          │
│  ⏳ 会议模式（评论聚合、决议生成）                             │
│  ⏳ 跨 Profile 状态共享机制                                  │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 两个仓库的分工（已确认）

| 仓库 | 职责 | 当前状态 | 目标状态 |
|------|------|---------|---------|
| **Open-Agent-Teams** | 抽象架构层、集成规格、共享核心库、技能包、实例模板 | 文档完善，代码骨架有，但术语需统一 | 成为真正的"上游依赖" |
| **DEV-Agent-Teams** | 5个开发Agent实例、Gateway、Dashboard、管理模板 | v0.3.0，基础实现完成，胶水层待实现 | 成为第一个"下游范例" |

### 2.3 核心数据流（当前实现 vs 目标）

#### 当前实现（v0.3.0）

```
用户请求
    │
    ▼
┌─────────────┐
│  Dashboard  │  (Next.js :3000) ✅ 已实现
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │  (:8400) ✅ 已实现
│  (Express)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   TeamOrchestrator      │  ✅ 已封装 @open-multi-agent/core
│   - runTeam()           │  → Goal → 自动DAG分解 → 并行执行
│   - runAgent()          │  → 单Agent路由
│   - runTasks()          │  → 显式任务列表
│   - SharedMemory        │  → 团队共享上下文（基础实现）
│   - MessageBus          │  → Agent间通信（基础实现）
│   - TaskQueue           │  → 任务依赖调度
└───────────┬─────────────┘
            │
    ┌───────┼───────┬───────────┐
    ▼       ▼       ▼           ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐
│前端Agent│ │后端Agent│ │测试Agent│ │DevOps  │
│(当前:  │ │(当前:  │ │(当前:  │ │(当前:  │
│ TS运行时)│ │ TS运行时)│ │ TS运行时)│ │ TS运行时)│
└──────┘ └──────┘ └──────┘ └────────┘
    │       │       │           │
    └───────┴───────┴───────────┘
                │
                ▼
        ┌───────────────┐
        │  SQLite 持久化  │  ✅ 已实现
        │  - 会话管理      │
        │  - 记忆存储（基础）│
        │  - 技能存储（基础）│
        └───────────────┘
```

#### 目标架构（胶水层实现后）

```
用户请求
    │
    ▼
┌─────────────┐
│  Dashboard  │  (Next.js :3000)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │  (:8400)
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   TeamOrchestrator      │  (@open-multi-agent/core)
│   (OMA 编排)             │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      胶水层 (Glue)       │  ⏳ 待实现
│   ┌─────────┬────────┐ │
│   │ 薄胶水   │ 厚胶水  │ │
│   │(单Agent │(多Agent │ │
│   │ 透传)   │ 协作)   │ │
│   └────┬────┴────┬───┘ │
│        │         │     │
│   ┌────┘         └────┐│
│   ▼                   ▼│
│ Hermes API         场景化记忆 │
│ Client             分层管理   │
└───────────┬─────────────┘
            │
    ┌───────┼───────┬───────────┐
    ▼       ▼       ▼           ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
│Hermes  │ │Hermes  │ │Hermes  │ │Hermes  │
│frontend│ │backend │ │testing │ │devops  │
│Profile │ │Profile │ │Profile │ │Profile │
│(Python)│ │(Python)│ │(Python)│ │(Python)│
└────────┘ └────────┘ └────────┘ └────────┘
```

---

## 三、思维导图细化拆解（标注实现状态）

### 3.1 横向编排（多Agent协同编排）

```
横向编排
├── 工作模式
│   ├── 工作流模式
│   │   ├── 适用：确定性任务（代码开发、测试、部署）
│   │   ├── 实现：OMA runTeam() → 自动DAG → 并行执行 ✅ 已实现
│   │   ├── 风险：过于僵化，无法处理意外
│   │   └── 缓解：设置Token预算上限 + 轮次限制（如最多10轮）⏳ 待配置
│   │
│   └── 会议模式
│       ├── 适用：开放性任务（需求讨论、架构设计）
│       ├── 实现：多Agent广播对话 ⏳ 待实现（需厚胶水介入）
│       ├── 风险：容易陷入无限对话，Token爆炸
│       └── 缓解：超过限制自动降级为工作流模式 ⏳ 待实现
│
├── 多Agent通信
│   ├── MessageBus（send/broadcast/subscribe）✅ 基础实现
│   ├── SharedMemory（团队共享上下文）✅ 基础实现（SQLite）
│   ├── delegate_to_agent（内置工具，带循环检测+深度限制）✅ OMA原生
│   └── 场景记忆沉淀 ⏳ 待实现（需场景化记忆分层）
│
└── 状态保持
    ├── 运行 ✅
    ├── 重启 ⏳ 待实现（Profile级）
    ├── 故障 → 框架内置重试 ✅ / Profile级故障恢复 ⏳ 待实现
    └── 关机 → 优雅停机 ⏳ 待实现
```

### 3.2 垂类沉淀（保证单Agent质量）

```
垂类沉淀
├── 单Agent持续集成
│   ├── 提示词工程
│   │   ├── 当前：基础systemPrompt ✅
│   │   └── 目标：Hermes式分层提示词（Identity + Context + Task）⏳ 待迁移
│   │
│   ├── Skills体系
│   │   ├── 当前：38个技能包（.agents/skills/）✅
│   │   └── 目标：agentskills.io标准兼容 + 自进化 ⏳ 待评估迁移成本
│   │
│   └── 记忆持久化
│       ├── 当前：SQLite基础会话存储 ✅
│       ├── 当前：上下文压缩器（token估算/自动摘要）✅
│       ├── 【Hermes提供】Identity快照（SOUL.md）⏳ 待桥接
│       ├── 【Hermes提供】SQLite FTS5全文检索跨会话召回 ⏳ 待桥接
│       └── 【Hermes提供】Procedural Skills（任务后自动提取可复用技能）⏳ 待桥接
│
└── 状态保持
    ├── 运行 ✅
    ├── 重启 ⏳
    ├── 故障 ⏳
    └── 关机 ⏳
```

### 3.3 公共（工程质量）

```
公共
├── 白盒Debug模式
│   ├── 思考重放
│   │   ├── 当前：OMA onTrace 有基础Trace ✅
│   │   └── 目标：Hermes式 Reflective Phase（任务后自我分析）⏳ 待桥接
│   └── 可视化DAG执行回放 ⏳ 待实现（Dashboard扩展）
│
├── 测试模式
│   ├── 单元测试覆盖Agent逻辑 ⏳ 待补充
│   ├── 集成测试覆盖多Agent协作 ⏳ 待补充
│   └── planOnly模式下的模拟执行验证 ✅ OMA原生
│
├── 自检模式
│   ├── Agent输出质量自动评估（LLM-as-a-judge）⏳ 待实现
│   └── 代码质量指标（覆盖率、Bug率）⏳ 待实现
│
├── 回滚机制
│   ├── 会话级回滚到任意步骤 ⏳ 待实现
│   └── 技能版本回滚 ⏳ 待实现
│
└── 日志系统
    ├── OMA onProgress 事件 ✅
    ├── OMA onTrace spans ✅
    └── 结构化日志聚合（ELK/Langfuse）⏳ 待集成
```

### 3.4 上下文优化

```
上下文优化
├── 单Agent持久化
│   ├── SQLite会话存储 ✅
│   ├── 上下文压缩器（token估算/自动摘要）✅
│   └── Hermes式三层记忆自动管理 ⏳ 待桥接
│
└── 多Agent协同时公共上下文维护
    ├── SharedMemory基础实现 ✅
    ├── 显式状态Schema（TypedDict）⏳ 待设计
    ├── 状态合并策略（last_write_wins / append / structured_merge）⏳ 待实现
    └── CRDT或乐观锁解决并发写冲突 ⏳ 待评估
```

---

## 四、当前工程中的问题清单（更新版）

### 4.1 术语与文档层（需修正）

| # | 问题 | 严重程度 | 当前状态 | 建议修改 |
|---|------|---------|---------|---------|
| **1** | **"OpenClaw"术语混淆** | 🔴 严重 | ❌ 仍未修正 | Open-Agent-Teams README 中大量使用"OpenClaw"，但实际编排层是`@open-multi-agent/core`。OpenClaw 是另一个真实项目（370K stars）。**必须全部替换**。 |
| **2** | 架构公式不一致 | 🔴 严重 | ❌ 仍未统一 | Open-Agent-Teams 写"OpenClaw × Hermes"，DEV-Agent-Teams 写"@open-multi-agent/core × Hermes"。**统一为后者**。 |
| **3** | 仓库关系描述不清 | 🟡 中等 | ⚠️ 部分正确 | "下游工程依赖上游的@open-agent-teams/core"——但 DEV-Agent-Teams 实际直接依赖`@open-multi-agent/core`，不是你自己的 core。**需明确依赖关系**。 |
| **4** | 缺少胶水层架构文档 | 🔴 严重 | ❌ 未写入 | DEV-Agent-Teams v0.3.0 已实现 Gateway/Dashboard/Orchestrator，但胶水层（Glue Service）尚未在文档中体现。**需补充 ADR**。 |

### 4.2 架构与代码层（已实现 vs 待实现）

| # | 问题 | 严重程度 | DEV-Agent-Teams v0.3.0 状态 | 说明 | 下一步 |
|---|------|---------|---------------------------|------|--------|
| **5** | **Hermes Profile 多实例生命周期管理** | 🔴 严重 | ⏳ 未实现 | 当前 Agent 是 TS 运行时，未接入 Hermes Python Profile。**需实现 Profile 启动/停止/健康检查**。 | 实现 `packages/glue-service/src/lifecycle/profile-manager.ts` |
| **6** | **胶水层（Glue Service）** | 🔴 严重 | ⏳ 未实现 | 核心创新点：薄胶水（单 Agent 透传）+ 厚胶水（多 Agent 协作）。**需作为独立服务或模块实现**。 | 参考 ADR-001 实现 |
| **7** | **场景化记忆分层** | 🔴 严重 | ⏳ 未实现 | 项目锚定记忆（层1）+ 协作会话记忆（层2）+ Agent 个体记忆（层3）。**当前只有基础 SQLite，未分层**。 | 设计 `packages/glue-service/src/memory/` 模块 |
| **8** | **会议模式** | 🟡 中等 | ⏳ 未实现 | 评论聚合、决议生成、版本快照。**当前只有工作流模式**。 | 在厚胶水中实现 |
| **9** | **跨 Profile 状态共享** | 🟡 中等 | ⏳ 未实现 | Profile 间需要共享项目上下文，但 Hermes Profile 默认隔离。**需胶水层介入**。 | 设计 SharedMemory 桥接机制 |
| **10** | Gateway 和 Dashboard 归属 | 🟡 中等 | ✅ 已留在 DEV-Agent-Teams | 当前合理：通用 Gateway 框架可下沉，DEV 特有 Dashboard 页面保留。 | 未来评估是否下沉 |
| **11** | 封装抽象层 | 🟡 中等 | ⚠️ 部分有 | TeamOrchestrator 已封装 OMA，但 Hermes 侧无抽象。**需增加 Hermes 适配器接口**。 | 实现 `HermesProfileAdapter` |
| **12** | 状态管理 | 🟡 中等 | ⚠️ 基础有 | SharedMemory 是 SQLite 黑盒，无 Schema、无合并策略。**需显式设计**。 | 定义状态 Schema + 合并策略 |
| **13** | 故障恢复 | 🟡 中等 | ⚠️ 部分有 | OMA 有重试，但 Profile 级故障恢复无。**需自愈机制**。 | 实现 Profile 健康检查 + 重启 |

### 4.3 工程化与质量层

| # | 问题 | 严重程度 | 当前状态 | 下一步 |
|---|------|---------|---------|--------|
| **14** | **测试覆盖不足** | 🔴 严重 | ❌ 几乎无 | 补充单元测试 + 集成测试 |
| **15** | 可观测性不够生产级 | 🟡 中等 | ⚠️ 基础有（OMA onTrace） | 集成 Langfuse 或扩展 Dashboard |
| **16** | 白盒Debug能力弱 | 🟡 中等 | ⚠️ 基础有 | 扩展 Dashboard DAG 回放 |
| **17** | 自检模式 | 🟡 中等 | ❌ 无 | 实现 LLM-as-a-judge |
| **18** | 回滚机制 | 🟡 中等 | ❌ 无 | 实现会话级回滚 |
| **19** | Token 预算控制 | 🟢 低 | ⚠️ 有规划 | 增加监控和告警 |

### 4.4 生态与标准化层

| # | 问题 | 严重程度 | 当前状态 | 下一步 |
|---|------|---------|---------|--------|
| **20** | Skills 兼容 agentskills.io | 🟡 中等 | ❓ 待评估 | 检查当前 38 个技能包格式 |
| **21** | 技能版本管理 | 🟡 中等 | ❌ 无 | 增加版本号 + 依赖声明 |
| **22** | 社区贡献入口 | 🟢 低 | ❌ 无 | 建立 CONTRIBUTING.md |

---

## 五、改进优先级路线图（更新版）

### Phase 0：紧急修正（立即）

| 任务 | 对应问题# | 工作量 | 验收标准 |
|------|----------|--------|---------|
| 统一术语：删除所有"OpenClaw"，替换为"@open-multi-agent/core" | 1, 2 | 0.5天 | 两个仓库 README 无"OpenClaw"残留 |
| 明确仓库依赖关系：DEV-Agent-Teams 直接依赖 @open-multi-agent/core | 3 | 0.5天 | 文档中依赖图正确 |
| 将 ADR-001（胶水层架构）写入 docs/ | 4 | 1天 | Open-Agent-Teams/docs/ 中有胶水层 ADR |

### Phase 1：核心能力实现（2-4周）

| 任务 | 对应问题# | 工作量 | 验收标准 |
|------|----------|--------|---------|
| 实现胶水层骨架（Glue Service） | 6 | 1周 | 可独立启动，管理5个 Profile 注册表 |
| 实现 Hermes Profile 生命周期管理 | 5 | 3-5天 | 启动/停止/健康检查/自愈 |
| 实现薄胶水：单 Agent 任务透传 | 6 | 3-5天 | executeTask() 延迟 < 500ms (P95) |
| 实现项目锚定记忆（层1） | 7 | 3-5天 | 文档版本化、CRUD、项目上下文注入 |

### Phase 2：协作能力实现（2-4周）

| 任务 | 对应问题# | 工作量 | 验收标准 |
|------|----------|--------|---------|
| 实现会议模式（厚胶水） | 8 | 1周 | 5个 Agent 参与，评论聚合，决议生成 |
| 实现协作会话记忆（层2） | 7 | 3-5天 | 会话创建/评论/归档/快照 |
| 实现跨 Profile 状态共享 | 9 | 3-5天 | 工作流模式下上下文正确传递 |
| 实现 Hermes 记忆桥接（层3只读） | 7 | 3-5天 | 可查询 Profile 记忆和技能 |

### Phase 3：工程化提升（2-4周）

| 任务 | 对应问题# | 工作量 | 验收标准 |
|------|----------|--------|---------|
| 补充测试覆盖（单元+集成） | 14 | 1周 | 覆盖率 > 60% |
| 集成可观测性（Langfuse 或自建） | 15 | 3-5天 | 成本监控 + 质量评估 |
| 扩展 Dashboard（DAG 回放、成本） | 16 | 3-5天 | 可视化任务执行链路 |
| 实现自检模式（LLM-as-a-judge） | 17 | 3-5天 | 自动评估 Agent 输出质量 |
| 实现回滚机制 | 18 | 3-5天 | 会话级回滚到任意步骤 |

### Phase 4：生态建设（持续）

| 任务 | 对应问题# | 工作量 | 验收标准 |
|------|----------|--------|---------|
| Skills 兼容 agentskills.io | 20 | 1周 | 技能包格式评估报告 |
| 技能版本管理 | 21 | 3-5天 | 技能支持版本号和依赖声明 |
| Gateway/Dashboard 下沉评估 | 10 | 1天 | 决策文档 |
| 社区贡献入口 | 22 | 1天 | CONTRIBUTING.md |

---

## 六、关键决策点（更新版）

### 决策1：胶水层实现方式

```
选项 A：独立服务（独立进程/容器）
  优点：解耦、可独立扩展、技术栈隔离
  缺点：网络延迟、部署复杂
  适用：生产环境

选项 B：DEV-Agent-Teams 内部模块
  优点：简单、延迟低、同进程调用
  缺点：耦合、不易替换
  适用：MVP验证

建议：Phase 1 选 B（快速验证），Phase 2 迁移到 A（生产就绪）
当前 DEV-Agent-Teams 结构适合先作为内部模块实现：
  packages/
    ├── glue-service/          # 新增
    │   ├── src/
    │   │   ├── thin-glue.ts
    │   │   ├── thick-glue.ts
    │   │   ├── memory/
    │   │   └── lifecycle/
    │   └── package.json
    ├── core/                  # 已有
    ├── gateway/               # 已有
    ├── agents/                # 已有
    └── dashboard/             # 已有
```

### 决策2：Hermes 接入时机

```
当前状态：DEV-Agent-Teams v0.3.0 的 Agent 是 TypeScript 运行时
目标状态：Agent 运行时切换为 Hermes Python Profile

迁移策略：
  Step 1：并行运行
    - TS Agent 继续服务现有功能
    - Hermes Profile 作为新选项接入
    - 用户可选择"传统模式"或"Hermes模式"

  Step 2：功能对齐
    - 验证 Hermes Profile 能完成所有 TS Agent 的任务
    - 对比输出质量、延迟、成本

  Step 3：逐步切换
    - 新功能默认使用 Hermes
    - 旧功能逐步迁移
    - TS Agent 作为 fallback

风险：Hermes 是 Python，DEV-Agent-Teams 是 TS，需要胶水层桥接
缓解：先实现胶水层，再逐步迁移
```

### 决策3：记忆分层存储选型

```
层 1（项目锚定记忆）：
  选型：Postgres（生产）/ SQLite（开发）
  理由：结构化文档、版本化、关系查询

层 2（协作会话记忆）：
  选型：Redis（活跃会话）+ Postgres（归档）
  理由：活跃会话需要快速读写，归档后持久化

层 3（Agent 个体记忆）：
  选型：Hermes Profile 自有 SQLite（不替代）
  理由：保持 Hermes 自进化闭环完整，胶水层只读桥接
```

---

## 七、成功标准（更新版）

### 7.1 短期（1个月内）
- [ ] 术语统一，无"OpenClaw"残留
- [ ] 胶水层骨架可运行（Profile 注册表 + 薄胶水透传）
- [ ] 基础测试覆盖率达到 40%
- [ ] 项目锚定记忆（层1）原型可用

### 7.2 中期（3个月内）
- [ ] 会议模式跑通（5个 Agent 参与，决议生成）
- [ ] Hermes Profile 与 TS Agent 并行运行
- [ ] 场景化记忆分层完整实现（三层）
- [ ] 测试覆盖率 > 70%

### 7.3 长期（6个月内）
- [ ] 全面切换为 Hermes Profile（TS Agent 作为 fallback）
- [ ] 自进化学习闭环可见（Skills 自动生成）
- [ ] 生产级可观测性（成本监控 + 质量评估）
- [ ] 第一个外部用户案例

---

## 八、附录：DEV-Agent-Teams v0.3.0 已实现功能清单

### 已完全实现 ✅

| 功能 | 位置 | 说明 |
|------|------|------|
| Gateway (:8400) | packages/gateway/ | Express 薄代理，委托 TeamOrchestrator |
| Dashboard (:3000) | packages/dashboard/ | Next.js 14 + Tailwind，实时 Agent 监控 |
| TeamOrchestrator | packages/core/src/team/ | 封装 @open-multi-agent/core |
| Agent 定义（5个） | packages/agents/ | frontend/backend/testing/devops/pm |
| SQLite 会话管理 | packages/core/src/session/ | 多会话隔离、软删除、并发锁 |
| 上下文压缩器 | packages/core/src/context/ | token估算、自动摘要 |
| Agent 间通信总线 | packages/core/src/bus/ | MessageBus 基础实现 |
| 工作流编排 | packages/core/src/workflow/ | 内置模板 |
| 容错机制 | packages/core/src/ | 重试、循环检测、Token预算 |

### 部分实现 ⚠️

| 功能 | 位置 | 说明 | 待完善 |
|------|------|------|--------|
| SharedMemory | packages/core/src/memory/ | 基础 SQLite 实现 | 需场景化分层 |
| 技能包 | .agents/skills/ | 38个技能 | 需评估 agentskills.io 兼容性 |

### 待实现 ⏳

| 功能 | 说明 |
|------|------|
| 胶水层（Glue Service） | 薄/厚胶水、Profile 生命周期、记忆分层 |
| Hermes Profile 接入 | Python 运行时桥接 |
| 会议模式 | 评论聚合、决议生成 |
| 可观测性 | Langfuse 集成、Dashboard 扩展 |
| 测试覆盖 | 单元测试 + 集成测试 |

---

*文档更新于 2026-06-17*
*基于 DEV-Agent-Teams v0.3.0 + Open-Agent-Teams 最新状态*
