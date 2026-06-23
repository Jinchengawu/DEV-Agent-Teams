# P0 技术方案：接入 Hermes Agent 替代 omAgent — 平台层与单 Agent 层解耦

> **状态**: ✅ 已完成  
> **提交**: `b72821f` refactor(core): 接入 Hermes Agent 替代 omAgent  
> **涉及文件**: 13 个，新增 626 行 / 删除 366 行  
> **作者**: DEV-Agent-Teams AI Agent  
> **日期**: 2026-06-23

---

## 1. 背景与问题

### 1.1 架构图要求

根据产品架构设计图，Open-Agent-Teams 平台应分为三层：

```
┌─────────────────────────────────────┐
│  用户交互层（Dashboard/CLI/IM）      │  ← 我们的
├─────────────────────────────────────┤
│  多 Agent 协作编排层（平台层）        │  ← 我们的
│  - 意图路由、编排、通信、冲突解决     │
│  - 跨 Agent 共享知识（RAG/向量库）   │
├─────────────────────────────────────┤
│  单 Agent 执行层（hermes-agent 集群）│  ← 复用 Hermes
│  - 工具、记忆、RAG、技能、代码执行   │
└─────────────────────────────────────┘
```

### 1.2 重构前的问题

**当前工程严重走偏** — `TeamOrchestrator` 直接依赖 `@open-multi-agent/core` 的 `OpenMultiAgent` 类，通过 `mimo` provider 调用 LLM：

```typescript
// 重构前 — 平台层重复实现了单 Agent 能力
this.omAgent = new OpenMultiAgent(orchestratorConfig);  // ❌ 错误
this.omAgent.runAgent({ name, model, provider: 'mimo', tools, customTools }, goal);
```

**问题**：
1. 平台层重复造轮子：工具调用、记忆、RAG 在 `omAgent` 和 `hermes` 中各有一份
2. 无法利用 Hermes 的 40+ 工具、三层记忆、技能系统、Docker 沙箱
3. 每个 Agent 共用同一套 `mimo` 模型，无法独立配置
4. 与架构图要求的"hermes-agent 实例集群"不匹配

### 1.3 重构目标

- 移除 `TeamOrchestrator` 对 `@open-multi-agent/core` 的依赖
- 创建 `HermesAgentClient` 通过 HTTP 调用 Hermes 实例（8201-8206）
- 平台层只保留：**编排、通信、路由、预算、Pipeline**
- 单 Agent 能力全部下沉到 Hermes 实例

---

## 2. 技术方案

### 2.1 架构设计

```
用户请求 → Gateway → TeamOrchestrator
                    │
                    ├─ 意图路由 → IntentRouter → 选择策略
                    │
                    ├─ 编排执行
                    │    ├─ 单 Agent: runAgent(agentId, goal)
                    │    │              ↓
                    │    │         HermesAgentClient.callAgent(820x)
                    │    │              ↓
                    │    │         POST http://127.0.0.1:820x/v1/chat/completions
                    │    │              ↓
                    │    │         Hermes 实例（自带工具/记忆/RAG）
                    │    │
                    │    ├─ Team: runTeam(goal) → 并行调用多个 Hermes
                    │    ├─ Meeting: runMeeting(goal) → 顺序调用 + 上下文累积
                    │    └─ Pipeline: PipelineOrchestrator → DAG 调用 Hermes
                    │
                    ├─ 通信 → MessageBus（EventEmitter）
                    │
                    └─ 预算 → TokenBudgetManager（跨面共享）
```

### 2.2 关键设计决策

| 决策 | 方案 | 理由 |
|------|------|------|
| 通信协议 | HTTP REST (`/v1/chat/completions`) | Hermes 已暴露 OpenAI 兼容 API，零改动 |
| 配置来源 | `config/oma/instances.yaml` | 复用已有配置，无需新增配置系统 |
| 失败处理 | `fetch` 异常捕获 + 返回降级结果 | 避免单个 Agent 失败导致整个 Pipeline 崩溃 |
| 工具调用 | 不通过 API 返回，Hermes 内部执行 | Hermes 的工具调用在实例内部完成 |
| 自定义工具 | 保留 `send_message` 等，通过 MessageBus | 平台层工具（跨 Agent 通信）仍然需要 |
| 预算管理 | 统一 `instanceId` 作为预算 session | Pipeline 所有面共享同一预算池 |

### 2.3 类型兼容性

**TokenUsage 统一**：

```typescript
// 统一前（混乱）
{ input: number; output: number }          // Pipeline types
{ input_tokens: number; output_tokens: number } // Orchestrator types
number                                      // Event types

// 统一后（全部使用）
{ input_tokens: number; output_tokens: number }
```

**所有类型定义**（Pipeline/Event/WorkflowState）同步修改。

---

## 3. 落地方案

### 3.1 新增文件

#### `packages/core/src/hermes/HermesAgentClient.ts`

```typescript
class HermesAgentClient {
  private config: HermesConfig;           // 从 YAML 加载
  private instanceMap: Map<string, HermesInstance>;

  // 核心方法
  async callAgent(agentId, goal, options): Promise<HermesAgentResult>
  async callAgents(agentIds, goal, options): Promise<Map<string, HermesAgentResult>>
  async healthCheck(agentId): Promise<{ online: boolean; latency: number }>
  async healthCheckAll(): Promise<Map<string, { online: boolean; latency: number }>>
}
```

**关键逻辑**：
- 读取 `config/oma/instances.yaml` 获取实例配置
- 通过 `fetch` POST 到 `http://127.0.0.1:${port}/v1/chat/completions`
- 请求体包含 `model: 'hermes-agent'`, `messages`, `max_tokens: 4000`
- 返回 `choices[0].message.content` 作为 Agent 输出
- 错误时返回 `{ success: false, output: '❌ Hermes 调用失败: ...' }` 降级结果

#### `packages/core/src/hermes/index.ts`

导出 `HermesAgentClient`, `HermesInstance`, `HermesConfig`, `HermesAgentResult` 类型。

### 3.2 修改文件

#### `packages/core/src/team/TeamOrchestrator.ts`（最大改动）

| 方法 | 重构前 | 重构后 |
|------|--------|--------|
| `runAgent` | `this.omAgent.runAgent({...})` | `this.hermesClient.callAgent(agentId, goal, { systemPrompt })` |
| `runTeam` | `this.omAgent.runTeam(this.team, goal)` | `this.intentRouter.route(goal)` → 并行 `runAgent` |
| `runMeeting` | `this.omAgent.runAgent({...}, prompt)` | 顺序 `runAgent` + 上下文累积 |
| `getMessages` | `this.team.getMessages(agent)` | `messageBus.getHistory(agentId)` |
| `broadcast` | `this.team.broadcast(...)` | `messageBus.broadcast(...)` |
| `shutdown` | `this.omAgent.shutdown()` | 空实现（HTTP 客户端无需关闭） |

**移除内容**：
- `import { OpenMultiAgent } from '@open-multi-agent/core'` — 已移除
- `this.omAgent.createTeam(...)` — 不再需要 Team 对象
- `registerTeam` 调用 — 不再需要

**保留内容**：
- `IntentRouter` — 路由决策不变
- `MessageBus` — 通信机制不变
- `EventBus` — 事件发布不变
- `TokenBudgetManager` — 预算检查不变
- `WorkflowStateManager` — 状态管理不变
- `PipelineOrchestrator` — 编排逻辑不变（内部已改为调用 `hermesClient`）

#### `packages/core/src/tools/send-message.ts`

- 移除 `import { defineTool } from '@open-multi-agent/core'`
- 移除 `import { getTeam } from './team-registry'`（不再依赖 Team 对象）
- 工具实现改为纯 `MessageBus` 调用
- 函数签名从 `createSendMessageTool(teamId)` 改为 `createSendMessageTool()`

#### `packages/core/src/tools/team-registry.ts`

- 标记废弃：`@deprecated` — 基于 Hermes 的架构不再使用 Team 注册
- 保留空实现以兼容现有代码

#### `packages/core/src/event/MessageBus.ts`

- 新增 `messageHistory: Map<string, AgentMessage[]>` 存储历史
- 新增 `getHistory(agentId: string): AgentMessage[]` 方法
- `send` 方法自动记录消息到历史

#### `packages/core/src/pipeline/types.ts`

- `tokenUsage?: { input: number; output: number }` → `tokenUsage?: TokenUsage`
- 导入 `TokenUsage` from `../orchestrator/types.js`

#### `packages/core/src/pipeline/Surface.ts`

- `tokenUsage` 赋值从 `{ input, output }` 改为 `{ input_tokens, output_tokens }`

#### `packages/core/src/event/types.ts`

- `tokenUsage?: number` → `tokenUsage?: TokenUsage`
- 导入 `TokenUsage` from `../orchestrator/types.js`

#### `packages/core/src/tools/kanban-tools.ts`

- `params.push(input.limit)` → `params.push(input.limit ?? 50)`（修复 undefined 类型错误）

#### `packages/core/src/index.ts`

- 新增 Hermes 模块导出：
```typescript
export { HermesAgentClient, createHermesAgentClient, getGlobalHermesClient } from './hermes';
export type { HermesInstance, HermesConfig, HermesAgentResult } from './hermes';
```

#### `packages/core/package.json`

- 新增 `yaml` 依赖：`"yaml": "^2.9.0"`

#### `config/oma/instances.yaml`

- 新增 `project-admin` 实例（端口 8206）

### 3.3 文件变更清单

```
A  packages/core/src/hermes/HermesAgentClient.ts   (+260)
A  packages/core/src/hermes/index.ts               (+10)
M  packages/core/src/team/TeamOrchestrator.ts      (-367, +317)
M  packages/core/src/tools/send-message.ts          (-29, +19)
M  packages/core/src/tools/team-registry.ts        (-11, +11)
M  packages/core/src/event/MessageBus.ts             (+12)
M  packages/core/src/event/types.ts                (+2)
M  packages/core/src/pipeline/types.ts             (+2)
M  packages/core/src/pipeline/Surface.ts             (+1)
M  packages/core/src/tools/kanban-tools.ts          (+1)
M  packages/core/src/index.ts                      (+7)
M  packages/core/package.json                      (+1)
M  config/oma/instances.yaml                      (+10)
```

---

## 4. 验证方案

### 4.1 编译验证

```bash
cd packages/core && pnpm check
# 期望: 无错误，无警告
```

### 4.2 单元验证

```bash
# 检查 Hermes 实例健康度
for port in 8201 8202 8203 8204 8205 8206; do
  curl -s http://127.0.0.1:$port/health | head -1
done

# 直接调用单个 Hermes Agent
curl -X POST http://127.0.0.1:8202/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### 4.3 集成验证（Pipeline）

```bash
# 执行 Pipeline
curl -X POST http://127.0.0.1:8400/v1/pipeline/execute \
  -H "Content-Type: application/json" \
  -d '{"pipelineId": "stock-analysis-system"}'

# 查询状态
curl http://127.0.0.1:8400/pipeline-instances/{instanceId}
```

**验证通过标准**：
- `pd` 面: completed（返回 PRD 文档）
- `fe` 面: completed（返回前端代码）
- `be` 面: completed（返回后端 API 设计）
- `e2e` 面: completed（返回测试报告）
- `cr` 面: completed（返回 Code Review 意见）
- `qc` 面: completed（返回质量评估）

### 4.4 实际验证结果

| 实例 | 端口 | 状态 | 结果 |
|------|------|------|------|
| dev-frontend | 8201 | ❌ 未启动 | fetch failed |
| **dev-backend** | **8202** | ✅ **在线** | 返回完整 FastAPI 后端方案 |
| dev-testing | 8203 | ❌ 未启动 | fetch failed |
| dev-devops | 8204 | ❌ 未启动 | fetch failed |
| dev-pm | 8205 | ❌ 未启动 | fetch failed |
| **project-admin** | **8206** | ❌ 未启动 | 实例未找到（配置已添加） |

**dev-backend 成功执行**：
- be 面：返回 RESTful API 设计（11 个端点）、数据库模型（User/Stock/Watchlist/FinancialStatement）、Python + FastAPI + SQLAlchemy 代码骨架
- cr 面：返回 Code Review 分析（指出其他面 fetch failed 的问题，建议 DevOps 排查）
- Token 用量：479 input + 6246 output

---

## 5. 风险与后续

### 5.1 已知风险

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| Hermes 实例未全部启动 | 部分 Agent 调用失败 | 已添加降级返回，不阻塞整个 Pipeline |
| YAML 配置未同步 | 新实例找不到 | 已添加到 `config/oma/instances.yaml` |
| 自定义工具（create_document 等） | 需要 Agent 注册 | 保留在 extraCustomTools 中，通过 hermes 的 systemPrompt 注入 |

### 5.2 用户需要补充的

1. **启动 Hermes 实例**：
   - 8201 — dev-frontend
   - 8203 — dev-testing
   - 8204 — dev-devops
   - 8205 — dev-pm
   - 8206 — project-admin（新增）

2. **验证自定义工具**：确认 Hermes 的 systemPrompt 中已包含 `create_document`/`create_task` 等工具的说明

### 5.3 后续 P1 计划

- **跨 Agent 共享知识中心**：建立平台层共享向量库，Hermes 各实例可以查询
- **多 Agent 循环编排**：CR 不通过 → 回到 FE 修改（DAG 增加循环边）
- **冲突解决机制**：project-admin 仲裁不同 Agent 意见分歧

---

## 6. 附录

### 6.1 Hermes 实例配置示例

```yaml
# config/oma/instances.yaml
instances:
  - id: dev-frontend
    label: "前端开发 Agent"
    port: 8201
    hermes_port: 8201
    tags: ["frontend", "react", "vue"]
    skills: ["react-development", "vue-development"]
    timeout_ms: 120000

  - id: dev-backend
    label: "后端开发 Agent"
    port: 8202
    hermes_port: 8202
    tags: ["backend", "api", "python"]
    skills: ["python-development", "api-design"]
    timeout_ms: 120000

  - id: dev-testing
    label: "测试开发 Agent"
    port: 8203
    hermes_port: 8203
    tags: ["testing", "test", "e2e"]
    skills: ["pytest-development", "e2e-testing"]
    timeout_ms: 180000

  - id: dev-devops
    label: "DevOps Agent"
    port: 8204
    hermes_port: 8204
    tags: ["devops", "docker", "k8s"]
    skills: ["docker-management", "kubernetes-deployment"]
    timeout_ms: 300000

  - id: dev-pm
    label: "产品经理 Agent"
    port: 8205
    hermes_port: 8205
    tags: ["pm", "product", "prd"]
    skills: ["prd-writing", "requirements-analysis"]
    timeout_ms: 120000

  - id: project-admin
    label: "项目管理员 Agent"
    port: 8206
    hermes_port: 8206
    tags: ["admin", "project", "management"]
    skills: ["project-management", "task-coordination"]
    timeout_ms: 120000
```

### 6.2 调用链时序

```
[用户] ──POST /v1/pipeline/execute──→ [Gateway]
                                      │
                                      ▼
                              [PipelineOrchestrator]
                                      │
                                      ├─ executeSurface('pd')
                                      │    │
                                      │    ▼
                                      │   [Surface] ── validateInput() ──✓
                                      │    │
                                      │    ▼
                                      │   [TeamOrchestrator.runAgent('dev-pm', goal)]
                                      │    │
                                      │    ▼
                                      │   [HermesAgentClient.callAgent('dev-pm', goal)]
                                      │    │
                                      │    ▼
                                      │   POST http://127.0.0.1:8205/v1/chat/completions
                                      │    │
                                      │    ▼
                                      │   [Hermes 实例] (自带工具/记忆/RAG)
                                      │    │
                                      │    ▼
                                      │   返回 { output, tokenUsage }
                                      │    │
                                      │    ▼
                                      │   [Surface] 提取 artifacts → 保存到 surfaceResults
                                      │
                                      ├─ executeSurface('fe') (fe/be 并行)
                                      │    │
                                      │    ▼ (从 pd 获取 artifacts 作为输入)
                                      │   [Surface.setInput('prd', pd.output)]
                                      │    │
                                      │    ▼
                                      │   [HermesAgentClient.callAgent('dev-frontend', goal)]
                                      │    │
                                      │    ▼
                                      │   POST http://127.0.0.1:8201/v1/chat/completions
                                      │
                                      ... (后续面同理)
```

### 6.3 关键代码片段

**HermesAgentClient.callAgent**（核心调用）：

```typescript
async callAgent(agentId: string, goal: string, options?: {
  systemPrompt?: string;
  maxTokens?: number;
}): Promise<HermesAgentResult> {
  const instance = this.instanceMap.get(agentId);
  const port = instance.hermes_port || instance.port;
  const url = `http://127.0.0.1:${port}/v1/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'hermes-agent',
      messages: [
        { role: 'system', content: options?.systemPrompt || `你是 ${instance.label}。` },
        { role: 'user', content: goal },
      ],
      max_tokens: options?.maxTokens || 4000,
      stream: false,
    }),
  });

  const data = await response.json();
  return {
    success: true,
    output: data.choices[0].message.content,
    tokenUsage: {
      input_tokens: data.usage?.prompt_tokens || 0,
      output_tokens: data.usage?.completion_tokens || 0,
    },
    ...
  };
}
```

**TeamOrchestrator.runAgent**（重构后）：

```typescript
async runAgent(agentId: string, goal: string, sessionId?: string): Promise<AgentRunResult> {
  const config = this.agentConfigs.get(agentId);
  const budgetSessionId = sessionId || agentId;

  // 检查预算
  this.checkBudget(budgetSessionId, 5000);

  // 调用 Hermes
  const hermesResult = await this.hermesClient.callAgent(agentId, goal, {
    systemPrompt: config.systemPrompt,
  });

  // 跟踪 Token
  this.trackTokenUsage(budgetSessionId, hermesResult.tokenUsage);

  // 转换为平台标准格式
  return {
    success: hermesResult.success,
    output: hermesResult.output,
    messages: hermesResult.messages.map(...),
    tokenUsage: hermesResult.tokenUsage,
    toolCalls: hermesResult.toolCalls.map(...),
  };
}
```

---

> **总结**：P0 重构成功将平台层（编排、通信、路由）与单 Agent 层（工具、记忆、RAG）彻底解耦。Hermes 负责"单 Agent 能做什么"，Open-Agent-Teams 负责"多 Agent 如何协作"。TypeScript 编译通过，dev-backend 验证成功，等待用户启动其余 Hermes 实例后即可全链路运行。
