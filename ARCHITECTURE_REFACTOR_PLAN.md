# DEV-Agent-Teams 架构改造执行方案

> 版本: v1.0  
> 日期: 2026-06-21  
> 范围: DEV-Agent-Teams（Open-Agent-Teams 作为基座，后续反哺）  

---

## 一、现状诊断

### 1.1 核心架构

```
Dashboard (Next.js) → Gateway (api-gateway.ts) → Agent (Hermes)
                            ↓
                      TeamOrchestrator
                            ↓
              runTeam / runMeeting / runAgent
```

### 1.2 关键缺陷

| 缺陷 | 严重度 | 影响 |
|------|--------|------|
| 看板/工作流/会议是**孤岛** | 🔴 P0 | 任务状态变更不会触发工作流 |
| Gateway 是**大泥球** | 🔴 P0 | 552 行处理路由+代理+健康+熔断+限流+日志 |
| Agent 间**同步 HTTP** | 🟡 P1 | 会议模式线性延迟，无并行能力 |
| 工作流**无断点续传** | 🟡 P1 | 进程崩溃需从头执行 |
| 安全性几乎为零 | 🟡 P2 | API Key 明文、无认证、无沙箱 |
| Token 无预算控制 | 🟡 P2 | 容易无限循环烧 token |

---

## 二、改造目标

### 2.1 短期目标（Phase 1-2）

- 看板 ↔ 工作流 ↔ 会议 形成**事件驱动闭环**
- Gateway 拆分为**独立服务模块**

### 2.2 中期目标（Phase 3-4）

- Agent 间通信改为**异步消息总线**
- 工作流支持**断点续传**

### 2.3 长期目标（Phase 5）

- 生产级安全与成本管控

---

## 三、执行方案（分 5 个 Phase）

### Phase 1: 事件总线 EventBus（打通孤岛）🔥 最高优先级

**目标**: 实现看板、工作流、会议之间的自动化联动

**设计**:

```typescript
// EventBus 核心 — 基于 Node.js EventEmitter 的轻量级实现
class EventBus {
  emit(event: KanbanEvent | WorkflowEvent | MeetingEvent): void;
  on(eventType: string, handler: (event) => Promise<void>): void;
}

// 事件类型定义
interface KanbanEvent {
  type: 'task.created' | 'task.status_changed' | 'task.completed';
  taskId: string;
  payload: { status: TaskStatus; assignee?: string; workflowId?: string };
}

interface WorkflowEvent {
  type: 'workflow.started' | 'workflow.completed' | 'workflow.failed';
  workflowId: string;
  payload: { taskId: string; output: string; error?: string };
}

interface MeetingEvent {
  type: 'meeting.started' | 'meeting.completed' | 'meeting.output';
  meetingId: string;
  payload: { summary: string; actionItems: ActionItem[] };
}
```

**联动规则**:

| 触发事件 | 执行动作 | 结果 |
|---------|---------|------|
| 看板任务状态 → `in_progress` | 自动触发绑定的工作流 | 工作流执行 |
| 工作流完成 | 自动更新看板任务状态 → `done` | 看板更新 |
| 会议完成 | 自动解析 action items → 创建看板任务 | 任务创建 |
| 看板任务创建 | 自动分配最佳 Agent（IntentRouter） | 自动指派 |

**文件变更**:

```
packages/core/src/
  event/
    EventBus.ts          # 事件总线核心
    types.ts             # 事件类型定义
    handlers/
      KanbanHandler.ts   # 看板事件处理
      WorkflowHandler.ts # 工作流事件处理
      MeetingHandler.ts  # 会议事件处理
      index.ts           # 注册所有 handler

packages/core/src/index.ts  # 导出 EventBus
```

**验证方式**:

1. 创建看板任务 → 状态改为 `in_progress` → 检查工作流是否自动触发
2. 工作流完成 → 检查看板任务状态是否自动变为 `done`
3. 会议模式结束 → 检查看板是否自动创建任务

---

### Phase 2: Gateway 拆分（解耦大泥球）

**目标**: 将 `api-gateway.ts` 从 552 行拆分为职责清晰的模块

**设计**:

```
packages/gateway/src/
  index.ts              # 服务入口（精简到 50 行）
  config/
    loader.ts           # 配置加载（YAML/env）
    types.ts            # 配置类型定义
  router/
    IntentRouter.ts     # 意图路由（从 api-gateway 提取）
    KeywordRouter.ts    # 关键词回退路由
    index.ts            # 路由组合
  proxy/
    AgentProxy.ts       # Agent HTTP 代理转发
  middleware/
    auth.ts             # 认证中间件
    rateLimiter.ts      # 限流中间件
    circuitBreaker.ts   # 熔断器中间件
    auditLogger.ts      # 审计日志中间件
  health/
    checker.ts          # 健康检查
  registry/
    AgentRegistry.ts    # Agent 注册表（从 api-gateway 提取）
```

**拆分策略**:

1. **先提取不改变行为的纯函数**：配置加载、关键词路由、健康检查
2. **再提取中间件**：限流、熔断、审计（用中间件模式包装）
3. **最后重构主入口**：用 Express/Fastify 替代原始 HTTP 服务器

**验证方式**:

- 所有现有 API 端点行为不变
- 单元测试覆盖每个模块

---

### Phase 3: 异步通信 NATS（替代同步 HTTP）

**目标**: Agent 间通信从同步 HTTP 改为异步消息总线

**设计**:

```typescript
// NATS 消息总线适配器
class NATSMessageBus {
  async publish(subject: string, message: AgentMessage): Promise<void>;
  async subscribe(subject: string, handler: (msg) => Promise<void>): Promise<void>;
  async request(subject: string, message: AgentMessage, timeout: number): Promise<AgentMessage>;
}

// AgentMessage 协议
interface AgentMessage {
  from: string;
  to: string | 'broadcast';
  type: 'chat' | 'tool_call' | 'task_assign' | 'status_update';
  content: string;
  metadata: { sessionId: string; timestamp: number; correlationId: string };
}
```

**改造范围**:

- `TeamOrchestrator.broadcast()` → 使用 NATS publish
- `TeamOrchestrator.sendMessage()` → 使用 NATS request-reply
- 会议模式 → 每个 Agent 独立订阅消息，真正并行发言

**验证方式**:

- 会议模式：5 个 Agent 的响应时间从线性变为接近并行
- 任务模式：Agent 故障不会卡住整个工作流

---

### Phase 4: 工作流状态机持久化（断点续传）

**目标**: 工作流执行状态持久化，支持断点续传

**设计**:

```typescript
interface WorkflowState {
  workflowId: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentStep: number;
  steps: WorkflowStep[];
  context: Record<string, unknown>;  // 共享上下文
  createdAt: Date;
  updatedAt: Date;
}

class WorkflowStateManager {
  async save(state: WorkflowState): Promise<void>;        // 保存到 SQLite
  async load(workflowId: string): Promise<WorkflowState>; // 从 SQLite 恢复
  async resume(workflowId: string): Promise<TeamRunResult>; // 断点续传
}
```

**改造范围**:

- `TeamOrchestrator.runTeam()` 每步执行后 save state
- 进程重启后，未完成的 workflow 自动 resume
- Dashboard 新增"工作流状态"面板

**验证方式**:

- 启动工作流 → 杀掉进程 → 重启 → 工作流从断点继续

---

### Phase 5: 安全与成本（Token 预算）

**目标**: 生产级安全与成本管控

**设计**:

```typescript
interface TokenBudget {
  sessionId: string;
  maxTokens: number;
  usedTokens: number;
  alertThreshold: number;  // 80% 时报警
}

class TokenBudgetManager {
  async checkBudget(sessionId: string, estimatedTokens: number): Promise<boolean>;
  async trackUsage(sessionId: string, actualTokens: number): Promise<void>;
  async getBudgetStatus(sessionId: string): Promise<TokenBudget>;
}
```

**改造范围**:

- 每次 LLM 调用前检查预算
- 预算耗尽时优雅降级（停止非关键 Agent）
- Dashboard 显示实时 token 消耗仪表盘
- API Key 加密存储（AES-256）

---

## 四、执行计划

| Phase | 内容 | 预计工时 | 依赖 |
|-------|------|---------|------|
| **Phase 1** | 事件总线 EventBus | 2-3 天 | 无 |
| **Phase 2** | Gateway 拆分 | 2-3 天 | 无 |
| **Phase 3** | NATS 异步通信 | 3-4 天 | Phase 1 |
| **Phase 4** | 工作流状态机 | 3-4 天 | Phase 1 |
| **Phase 5** | 安全与成本 | 2-3 天 | Phase 4 |

**总计**: 约 12-17 天（约 2.5-3 周）

---

## 五、风险与缓解

| 风险 | 缓解措施 |
|------|---------|
| NATS 引入新依赖 | Phase 3 提供纯 Node.js 回退（EventEmitter） |
| 工作流状态机兼容性问题 | 新 API 与旧 API 并存，渐进式迁移 |
| Gateway 拆分引入回归 | 每个模块有独立测试，主流程用 E2E 测试覆盖 |
| Token 预算误杀 | 可配置阈值，支持人工 override |

---

## 六、成功标准

1. **Phase 1 完成**: 看板任务状态变更 → 5 秒内工作流自动触发
2. **Phase 2 完成**: Gateway 主文件 < 100 行，各模块独立可测
3. **Phase 3 完成**: 会议模式 5 Agent 总响应时间 < 2x 单 Agent 时间
4. **Phase 4 完成**: 进程重启后，工作流从断点续传成功率 100%
5. **Phase 5 完成**: Token 消耗超过预算时，系统自动停止并通知用户

---

*本方案由架构师 Agent 基于审计报告生成，经与 Owner 讨论后执行。*
