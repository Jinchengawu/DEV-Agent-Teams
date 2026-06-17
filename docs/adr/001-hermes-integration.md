# ADR-001: Hermes 整合方案

## 状态

**已接受** — 2026-06-17

## 背景

DEV-Agent-Teams 是一个多 Agent 协作开发系统，当前使用 `@open-multi-agent/core` 进行水平编排（任务分解、DAG 执行、消息总线）。但缺乏垂直领域深度能力：

- 无技能系统（Skills）
- 无持久化记忆（长期记忆、工作记忆）
- 无身份管理（Identity）
- 无过程性知识（Procedural Knowledge）

[Hermes](https://github.com/anthropics/hermes) 是一个 Agent 纵向能力框架，提供：
- **Skills**: 可组合的技能包（markdown 定义 + 脚本）
- **Memory**: 三层记忆架构（长期/工作/情景）
- **Identity**: Agent 身份和角色管理
- **Hooks**: 生命周期钩子系统

## 决策

采用 **渐进式整合** 策略，分三个阶段将 Hermes 能力注入 DEV-Agent-Teams：

### Phase 1: 技能系统接入（当前）

**目标**: 让每个 Agent 能加载和执行 Hermes 技能

**方案**:
1. 在 `TeamAgentConfig` 中添加 `skills` 字段，指向技能目录
2. Agent 启动时扫描 `SKILL.md`，解析 frontmatter（name、description、tools）
3. 技能作为工具注册到 Agent 的工具列表中
4. 技能执行通过 `scripts/` 中的脚本完成

**变更范围**:
- `packages/core/src/orchestrator/types.ts` — 添加 `skills` 字段
- `packages/core/src/team/TeamOrchestrator.ts` — 技能加载逻辑
- `packages/agents/*/src/index.ts` — 各 Agent 声明技能

**示例**:
```typescript
// packages/agents/frontend/src/index.ts
export const agentConfig = {
  id: 'dev-frontend',
  name: 'Frontend Agent',
  role: '前端开发专家',
  skills: [
    'skills/react-development',
    'skills/vue-development',
    'skills/css-tailwind',
  ],
};
```

### Phase 2: 记忆系统集成

**目标**: 为 Agent 提供跨会话的持久化记忆

**方案**:
1. 复用 Hermes 的 MemoryStore 接口
2. 基于 SQLite 实现（复用 SessionManager 的数据库）
3. 三层记忆：
   - **长期记忆**: FTS5 全文搜索，存储知识库
   - **工作记忆**: 当前任务上下文（JSON）
   - **情景记忆**: 交互历史摘要

**变更范围**:
- `packages/core/src/memory/` — 新增记忆模块
- `packages/core/src/session/SessionManager.ts` — 扩展存储能力

### Phase 3: 身份和钩子系统

**目标**: Agent 身份管理和生命周期钩子

**方案**:
1. Identity 管理：每个 Agent 有持久化的身份配置
2. Hooks 系统：在任务开始/结束、消息发送/接收时触发
3. 与 `@open-multi-agent/core` 的事件系统集成

## 后果

### 正面

- Agent 能力显著提升（技能、记忆、身份）
- 复用 Hermes 生态的现有技能包
- 渐进式迁移，不破坏现有功能
- 为后续高级功能（自学习、知识积累）奠定基础

### 负面

- 增加系统复杂度
- 需要维护与 Hermes 的兼容性
- SQLite 存储可能成为性能瓶颈（远期）

### 风险

| 风险 | 缓解措施 |
|------|----------|
| Hermes API 变更 | 通过 IOrchestrator 接口隔离 |
| 技能加载失败 | 降级为无技能模式，不影响核心功能 |
| 记忆数据膨胀 | 定期清理 + 摘要压缩 |

## 替代方案

### 方案 A: 完全重写

用 Hermes 替代 `@open-multi-agent/core`。

** rejected **: 工作量太大，且 `@open-multi-agent/core` 的水平编排能力成熟。

### 方案 B: 插件化集成

将 Hermes 作为插件注入。

** rejected **: Hermes 设计为框架级集成，插件化会限制能力。

### 方案 C: 渐进式整合（已选择）

分阶段接入 Hermes 能力，保持 `@open-multi-agent/core` 作为编排核心。

** accepted **: 风险可控，收益明确。

## 参考

- [Hermes 官方文档](https://github.com/anthropics/hermes)
- [Open Multi Agent](https://github.com/open-multi-agent)
- [docs/task/Open-Agent-Teams-分析改进文档.md](../task/Open-Agent-Teams-分析改进文档.md)
