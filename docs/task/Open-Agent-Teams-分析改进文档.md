# Open-Agent-Teams 项目架构分析与改进路线图

> 生成时间：2026-06-17
> 基于：Open-Agent-Teams（抽象架构层）+ DEV-Agent-Teams（开发场景实现）+ 思维导图

---

## 一、项目定位（一句话）

**Open-Agent-Teams = @open-multi-agent/core（横向编排）× Hermes Agent（垂类深度）在开发场景下的生产级整合方案。**

我们不是通用Agent框架，而是：
- 不做编排引擎（交给 OMA）
- 不做单Agent运行时（交给 Hermes）
- **做** 的是：让这两个最强框架在开发团队中无缝协作，提供开箱即用的开发团队模板

---

## 二、当前架构总览

### 2.1 架构公式

```
┌─────────────────────────────────────────────────────────────┐
│                    Open-Agent-Teams                          │
│         （抽象架构层 + 集成规格 + 技能包 + 实例模板）            │
├─────────────────────────────────────────────────────────────┤
│  横向编排层                    │  垂类深度层                 │
│  @open-multi-agent/core        │  Hermes Agent (Nous Research)│
│  - Goal-first 自动DAG分解       │  - 三层记忆架构              │
│  - 3运行时依赖                  │  - 自进化学习闭环            │
│  - 12+模型提供商                │  - 40+内置工具               │
│  - Plan-only / 模型路由         │  - SQLite FTS5 跨会话召回    │
│  - onTrace / Dashboard          │  - agentskills.io 标准       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    DEV-Agent-Teams                           │
│              （开发场景具体实现 + Next.js Dashboard）         │
│  - dev-frontend / dev-backend / dev-testing                │
│  - dev-devops / dev-pm                                      │
│  - Gateway (:8400) + Dashboard (:3000)                      │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 两个仓库的分工

| 仓库 | 职责 | 当前状态 | 目标状态 |
|------|------|---------|---------|
| **Open-Agent-Teams** | 抽象架构层、集成规格、共享核心库、技能包、实例模板 | 文档完善，代码骨架有 | 成为真正的"上游依赖" |
| **DEV-Agent-Teams** | 5个开发Agent实例、Gateway、Dashboard、管理模板 | 有基础实现，v0.3.0 | 成为第一个"下游范例" |

### 2.3 核心数据流

```
用户请求
    │
    ▼
┌─────────────┐
│  Dashboard  │  (Next.js :3000)
│  (Next.js)  │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Gateway   │  (:8400)
│  (薄代理层)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────┐
│   TeamOrchestrator      │  (@open-multi-agent/core)
│   - runTeam()           │  → Goal → 自动DAG分解 → 并行执行
│   - runAgent()          │  → 单Agent路由
│   - runTasks()          │  → 显式任务列表
│   - SharedMemory        │  → 团队共享上下文
│   - MessageBus          │  → Agent间通信
│   - TaskQueue           │  → 任务依赖调度
└───────────┬─────────────┘
            │
    ┌───────┼───────┬───────────┐
    ▼       ▼       ▼           ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌────────┐
│前端Agent│ │后端Agent│ │测试Agent│ │DevOps  │
│(Hermes)│ │(Hermes)│ │(Hermes)│ │(Hermes)│
└──────┘ └──────┘ └──────┘ └────────┘
    │       │       │           │
    └───────┴───────┴───────────┘
                │
                ▼
        ┌───────────────┐
        │  SQLite 持久化  │
        │  - 会话管理      │
        │  - 记忆存储      │
        │  - 技能进化日志  │
        └───────────────┘
```

---

## 三、思维导图细化拆解

### 3.1 横向编排（多Agent协同编排）

```
横向编排
├── 工作模式
│   ├── 工作流模式
│   │   └── 适用：确定性任务（代码开发、测试、部署）
│   │   └── 实现：OMA runTeam() → 自动DAG → 并行执行
│   │   └── 风险：过于僵化，无法处理意外
│   │   └── 缓解：设置Token预算上限 + 轮次限制（如最多10轮）
│   └── 会议模式
│       └── 适用：开放性任务（需求讨论、架构设计）
│       └── 实现：多Agent广播对话
│       └── 风险：容易陷入无限对话，Token爆炸
│       └── 缓解：超过限制自动降级为工作流模式
│
├── 多Agent通信
│   ├── MessageBus（send/broadcast/subscribe）
│   ├── SharedMemory（团队共享上下文）
│   ├── delegate_to_agent（内置工具，带循环检测+深度限制）
│   └── 场景记忆沉淀
│       └── 【当前缺失】需要实现：跨会话的场景记忆复用
│
└── 状态保持
    ├── 运行
    ├── 重启
    ├── 故障 → 【当前缺失】故障恢复机制
    └── 关机 → 【当前缺失】优雅停机 + 状态持久化
```

### 3.2 垂类沉淀（保证单Agent质量）

```
垂类沉淀
├── 单Agent持续集成
│   ├── 提示词工程
│   │   └── 当前：基础systemPrompt
│   │   └── 目标：Hermes式分层提示词（Identity + Context + Task）
│   ├── Skills体系
│   │   └── 当前：38个技能包（.agents/skills/）
│   │   └── 目标：agentskills.io标准兼容 + 自进化
│   └── 记忆持久化
│       ├── 【当前实现】SQLite基础会话存储
│       ├── 【缺失】Identity快照（Hermes SOUL.md）
│       ├── 【缺失】SQLite FTS5全文检索跨会话召回
│       └── 【缺失】Procedural Skills（任务后自动提取可复用技能）
│
└── 状态保持
    ├── 运行
    ├── 重启
    ├── 故障
    └── 关机
```

### 3.3 公共（工程质量）

```
公共
├── 白盒Debug模式
│   ├── 思考重放
│   │   └── 【当前】OMA onTrace 有基础Trace
│   │   └── 【缺失】Hermes式 Reflective Phase（任务后自我分析）
│   └── 【缺失】可视化DAG执行回放（类似OMA Dashboard但更丰富）
│
├── 测试模式
│   └── 【当前缺失】单元测试覆盖Agent逻辑
│   └── 【当前缺失】集成测试覆盖多Agent协作
│   └── 【当前缺失】planOnly模式下的模拟执行验证
│
├── 自检模式
│   └── 【当前缺失】Agent输出质量自动评估（LLM-as-a-judge）
│   └── 【当前缺失】代码质量指标（覆盖率、Bug率）
│
├── 回滚机制
│   └── 【当前缺失】会话级回滚到任意步骤
│   └── 【当前缺失】技能版本回滚
│
└── 日志系统
    ├── 【当前】OMA onProgress 事件
    ├── 【当前】OMA onTrace spans
    └── 【缺失】结构化日志聚合（ELK/Langfuse）
```

### 3.4 上下文优化

```
上下文优化
├── 单Agent持久化
│   ├── 【当前】SQLite会话存储
│   ├── 【当前】上下文压缩器（token估算/自动摘要）
│   └── 【缺失】Hermes式三层记忆自动管理
│
└── 多Agent协同时公共上下文维护
    ├── 【当前】SharedMemory基础实现
    ├── 【缺失】显式状态Schema（TypedDict）
    ├── 【缺失】状态合并策略（last_write_wins / append / structured_merge）
    └── 【缺失】CRDT或乐观锁解决并发写冲突
```

---

## 四、当前工程中的不足清单

### 4.1 术语与文档层

| # | 问题 | 严重程度 | 说明 | 建议修改 |
|---|------|---------|------|---------|
| 1 | **"OpenClaw"术语混淆** | 🔴 严重 | Open-Agent-Teams README中大量使用"OpenClaw"，但：①OpenClaw是真实存在的另一个项目（Peter Steinberger，370K stars）；②你的实际编排层是`@open-multi-agent/core` | 全部替换为"@open-multi-agent/core"或简称"OMA" |
| 2 | 架构公式不一致 | 🟡 中等 | Open-Agent-Teams说"OpenClaw × Hermes"，DEV-Agent-Teams说"@open-multi-agent/core × Hermes" | 统一为"@open-multi-agent/core × Hermes" |
| 3 | 仓库关系描述不清 | 🟡 中等 | "下游工程依赖上游的@open-agent-teams/core"——但DEV-Agent-Teams实际依赖的是`@open-multi-agent/core`，不是你自己的core | 明确：DEV-Agent-Teams直接依赖`@open-multi-agent/core` + 你的封装层 |

### 4.2 架构与代码层

| # | 问题 | 严重程度 | 说明 | 建议 |
|---|------|---------|------|------|
| 4 | **Hermes整合方式未明确** | 🔴 严重 | DEV-Agent-Teams是纯TypeScript/Node.js，但Hermes是Python。当前代码中没有Hermes的实际集成，只有概念引用 | 明确方案A（进程通信）或方案B（概念移植），并在文档中说明 |
| 5 | 三层记忆架构未实现 | 🔴 严重 | 思维导图中有"记忆持久化"，但当前只有基础SQLite会话存储，缺少：①Identity快照 ②FTS5全文检索 ③Procedural Skills自进化 | 参考Hermes架构，在TypeScript层实现或桥接Hermes Python服务 |
| 6 | 自进化学习闭环缺失 | 🔴 严重 | 这是Hermes的核心卖点，但当前代码中没有Reflective Phase、没有自动技能生成、没有技能自改进 | 这是最大差异化，必须实现 |
| 7 | Gateway和Dashboard归属不清 | 🟡 中等 | 当前在DEV-Agent-Teams中，但是否通用？ | 如果是通用基础设施，下沉到Open-Agent-Teams；如果是DEV专用，保留 |
| 8 | 封装抽象层不足 | 🟡 中等 | 直接暴露OMA API，未来替换成本高 | 增加`Orchestrator`接口封装，解耦底层 |
| 9 | 状态管理过于简单 | 🟡 中等 | SharedMemory是"黑盒"共享，无Schema、无合并策略、无并发控制 | 引入显式状态Schema + 合并策略 + 乐观锁 |
| 10 | 故障恢复机制缺失 | 🟡 中等 | 思维导图有"故障"状态，但代码中没有实现 | 实现：失败重试、会话恢复、部分结果保存 |

### 4.3 工程化与质量层

| # | 问题 | 严重程度 | 说明 | 建议 |
|---|------|---------|------|------|
| 11 | **测试覆盖不足** | 🔴 严重 | 没有单元测试、没有集成测试、没有planOnly模拟验证 | 补充测试：Agent逻辑测试、多Agent协作测试、DAG执行测试 |
| 12 | 可观测性不够生产级 | 🟡 中等 | 有OMA的onTrace，但缺少：结构化日志聚合、成本监控、在线评估 | 集成Langfuse或自建Telemetry层 |
| 13 | 白盒Debug能力弱 | 🟡 中等 | 有基础Trace，但缺少可视化回放、思考重放 | 扩展Dashboard，增加DAG执行回放功能 |
| 14 | 自检模式未实现 | 🟡 中等 | 思维导图中有，代码中没有 | 实现LLM-as-a-judge自动评估Agent输出 |
| 15 | 回滚机制未实现 | 🟡 中等 | 思维导图中有，代码中没有 | 实现会话级回滚 + 技能版本管理 |
| 16 | Token预算控制待验证 | 🟢 低 | 有规划但不确定实际效果 | 增加监控和告警 |

### 4.4 生态与标准化层

| # | 问题 | 严重程度 | 说明 | 建议 |
|---|------|---------|------|------|
| 17 | Skills未兼容agentskills.io | 🟡 中等 | Hermes支持agentskills.io开放标准，你的38个技能包可能不兼容 | 评估并迁移到标准格式 |
| 18 | 缺少技能版本管理 | 🟡 中等 | 技能进化后如何版本控制？ | 增加技能版本号 + 依赖声明 |
| 19 | 社区贡献入口缺失 | 🟢 低 | 技能包目前只有你自己维护 | 建立CONTRIBUTING.md + 技能提交模板 |

---

## 五、改进优先级路线图

### Phase 1：紧急修复（1-2周）

| 任务 | 对应问题# | 工作量 |
|------|----------|--------|
| 统一术语：删除所有"OpenClaw"，替换为"@open-multi-agent/core"或"OMA" | 1, 2, 3 | 1天 |
| 明确Hermes整合方式：写ADR（Architecture Decision Record） | 4 | 2天 |
| 增加Orchestrator接口封装层 | 8 | 3天 |
| 补充基础单元测试框架 | 11 | 3天 |

### Phase 2：核心能力补齐（2-4周）

| 任务 | 对应问题# | 工作量 |
|------|----------|--------|
| 实现三层记忆架构（Identity + FTS5 + Procedural Skills） | 5 | 1-2周 |
| 实现自进化学习闭环（Reflective Phase） | 6 | 1-2周 |
| 重构状态管理：显式Schema + 合并策略 | 9 | 3-5天 |
| 实现故障恢复机制 | 10 | 3-5天 |

### Phase 3：工程化提升（2-4周）

| 任务 | 对应问题# | 工作量 |
|------|----------|--------|
| 集成可观测性（Langfuse或自建Telemetry） | 12 | 3-5天 |
| 扩展Dashboard：DAG回放 + 成本监控 | 13 | 1周 |
| 实现自检模式（LLM-as-a-judge） | 14 | 3-5天 |
| 实现回滚机制 | 15 | 3-5天 |
| Skills兼容agentskills.io标准 | 17 | 3-5天 |

### Phase 4：生态建设（持续）

| 任务 | 对应问题# | 工作量 |
|------|----------|--------|
| Gateway/Dashboard下沉决策 | 7 | 1天决策 |
| 技能市场建设 | 18, 19 | 持续 |
| 生产案例积累 | - | 持续 |

---

## 六、关键决策点

### 决策1：Hermes整合方式

```
选项A：进程间通信（HTTP/gRPC桥接）
  优点：完整利用Hermes Python能力（FTS5、Reflective Phase、Skills Hub）
  缺点：部署复杂、需要Python运行时、跨语言调试困难
  适用：需要完整Hermes能力的生产环境

选项B：概念移植（TypeScript重新实现）
  优点：单一技术栈、部署简单、性能更好
  缺点：需要自己实现Hermes的核心算法、可能偏离原版行为
  适用：轻量部署、快速迭代

建议：短期选B（MVP验证），长期选A（完整能力）
```

### 决策2：Gateway/Dashboard归属

```
选项A：留在DEV-Agent-Teams（当前）
  理由：Gateway和Dashboard有DEV场景特有的逻辑

选项B：下沉到Open-Agent-Teams
  理由：任何下游工程都需要Gateway和Dashboard，通用部分应共享

建议：拆分——通用Gateway框架下沉，DEV特有的Dashboard页面留在下游
```

### 决策3：可观测性方案

```
选项A：集成Langfuse（开源，框架无关）
  优点：成熟、社区大、支持任何框架
  缺点：额外依赖、需要自建或付费

选项B：扩展OMA的onTrace自建
  优点：轻量、可控
  缺点：需要自己维护、功能有限

建议：短期用B（基于OMA onTrace扩展），长期迁移到A（Langfuse）
```

---

## 七、成功标准

### 7.1 短期（1个月内）
- [ ] 术语统一，无"OpenClaw"残留
- [ ] Hermes整合方案明确（ADR文档）
- [ ] 基础测试覆盖率达到60%
- [ ] 三层记忆架构原型可用

### 7.2 中期（3个月内）
- [ ] 自进化学习闭环跑通（一个Agent能自动生成并改进技能）
- [ ] Dashboard支持DAG执行回放
- [ ] 可观测性接入（成本监控 + 质量评估）
- [ ] 第一个外部用户案例

### 7.3 长期（6个月内）
- [ ] Skills市场开放社区贡献
- [ ] 支持非DEV场景（如设计团队、产品团队）
- [ ] 生产级稳定性（99.9%可用性）
- [ ] 与LangGraph/CrewAI形成明确差异化认知

---

*文档结束*
