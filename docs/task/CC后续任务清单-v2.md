# DEV-Agent-Teams 后续任务清单（给 Claude Code）

> 生成时间：2026-06-17
> 基于：最终评估报告（完成度 ~65%，Hermes 端到端验证为唯一关键风险）
> 目标：补齐缺口，完成 Hermes 端到端验证，达到生产可用

---

## 一、本周必须完成（P0 — 阻塞生产可用）

### 任务 1：Hermes 端到端验证（最高优先级）

**目标**：确认代码接口能驱动真实 Hermes Python 进程工作

**当前状态**：
- ✅ 薄胶水代码：`fetch http://127.0.0.1:${port}/v1/chat/completions`
- ✅ Profile 管理器：`spawn(pythonPath, args)`
- ❌ 未启动真实 Hermes Python 进程
- ❌ 未验证 HTTP 调用返回正确结果
- ❌ 未验证自进化闭环（Reflective Phase）

**执行步骤**：

```bash
# Step 1：安装 Hermes Python 运行时
pip install hermes-agent
# 或
pip install -r requirements.hermes.txt

# Step 2：创建 5 个 Profile 工作区
mkdir -p workspaces/{frontend,backend,testing,devops,pm}

# Step 3：启动 5 个 Hermes Profile 进程（手动验证）
hermes server --port 8081 --profile dev-frontend --workspace ./workspaces/frontend &
hermes server --port 8082 --profile dev-backend --workspace ./workspaces/backend &
hermes server --port 8083 --profile dev-testing --workspace ./workspaces/testing &
hermes server --port 8084 --profile dev-devops --workspace ./workspaces/devops &
hermes server --port 8085 --profile dev-pm --workspace ./workspaces/pm &

# Step 4：健康检查
curl http://localhost:8081/health
curl http://localhost:8082/health
curl http://localhost:8083/health
curl http://localhost:8084/health
curl http://localhost:8085/health

# Step 5：通过薄胶水调用（端到端验证）
curl -X POST http://localhost:8400/api/glue/execute   -H "Content-Type: application/json"   -d '{
    "agentId": "dev-frontend",
    "task": "创建一个 React 登录按钮组件，包含用户名和密码输入框"
  }'

# Step 6：检查 Hermes 记忆和技能（自进化验证）
ls workspaces/frontend/skills/
cat workspaces/frontend/MEMORY.md
cat workspaces/frontend/SOUL.md

# Step 7：执行多个任务，验证 Skills 自动生成
# 再次调用薄胶水执行类似任务
# 检查 skills/ 目录是否有新文件（如 react-form-patterns.md）
```

**验收标准**：
- [ ] 5 个 Hermes Profile 进程正常启动
- [ ] 健康检查全部返回 200
- [ ] 薄胶水调用返回有意义的代码/文本（非错误）
- [ ] 执行多个任务后，`workspaces/frontend/skills/` 有新文件生成
- [ ] `MEMORY.md` 有更新记录

**失败处理**：
- 如果 Hermes API 端口不匹配 → 修正 `config/profiles.ts` 端口映射
- 如果 Hermes 返回格式不匹配 → 修正 `thin-glue.ts` 解析逻辑
- 如果 Hermes 未安装 → 添加 `requirements.hermes.txt` + 安装脚本

---

### 任务 2：Profile 启动集成到启动脚本

**目标**：`pnpm dev` 一键启动所有服务（包括 Hermes Profile）

**当前状态**：
- ✅ `pnpm dev` 启动 Gateway + Dashboard
- ❌ 不自动启动 Hermes Profile

**执行步骤**：

```typescript
// 修改 scripts/dev.js 或 package.json scripts
{
  "scripts": {
    "dev": "concurrently "pnpm:dev:gateway" "pnpm:dev:dashboard" "pnpm:dev:hermes"",
    "dev:gateway": "cd packages/gateway && pnpm dev",
    "dev:dashboard": "cd packages/dashboard && pnpm dev",
    "dev:hermes": "cd packages/glue-service && pnpm dev:profiles"
  }
}

// 或新增 scripts/start-hermes.js
const { spawn } = require('child_process');
const profiles = [
  { name: 'dev-frontend', port: 8081, workspace: './workspaces/frontend' },
  { name: 'dev-backend', port: 8082, workspace: './workspaces/backend' },
  { name: 'dev-testing', port: 8083, workspace: './workspaces/testing' },
  { name: 'dev-devops', port: 8084, workspace: './workspaces/devops' },
  { name: 'dev-pm', port: 8085, workspace: './workspaces/pm' },
];

// 检查 Hermes 是否安装，未安装则提示
// 启动所有 Profile 进程
// 等待健康检查通过
// 输出启动状态
```

**验收标准**：
- [ ] `pnpm dev` 一键启动所有服务
- [ ] 终端显示每个 Profile 启动状态
- [ ] 任一 Profile 启动失败时，整体失败并提示

---

## 二、本周应完成（P1 — 功能补齐）

### 任务 3：实现 `executeParallel`（批量并行任务）

**目标**：薄胶水支持同时调用多个 Profile

**当前状态**：
- ✅ 单 Agent 调用：`executeTask(agentId, task)`
- ❌ 批量并行：未实现

**接口设计**：

```typescript
// packages/glue-service/src/thin-glue.ts
interface ParallelTaskRequest {
  agentId: string;
  task: string;
  context?: string;
  maxTokens?: number;
}

interface ParallelTaskResponse {
  results: Map<string, TaskResponse>;
  failed: string[];  // 失败的 agentId 列表
  totalTokens: number;
  totalDuration: number;
}

class ThinGlue {
  async executeParallel(
    requests: ParallelTaskRequest[],
    options?: { maxConcurrency?: number; timeout?: number }
  ): Promise<ParallelTaskResponse> {
    // 使用 Promise.allSettled 并行执行
    // 支持 maxConcurrency 限制（默认 5）
    // 任一失败不影响其他
    // 返回聚合结果
  }
}
```

**测试用例**：

```typescript
// packages/glue-service/src/thin-glue.test.ts
it('should execute tasks in parallel', async () => {
  const results = await thinGlue.executeParallel([
    { agentId: 'dev-frontend', task: '创建 header' },
    { agentId: 'dev-backend', task: '创建 /api/user' },
    { agentId: 'dev-testing', task: '写登录测试' },
  ]);
  expect(results.results.size).toBe(3);
  expect(results.failed).toHaveLength(0);
});

it('should handle partial failures', async () => {
  const results = await thinGlue.executeParallel([
    { agentId: 'dev-frontend', task: 'valid task' },
    { agentId: 'invalid-agent', task: 'this will fail' },
  ]);
  expect(results.results.size).toBe(1);
  expect(results.failed).toContain('invalid-agent');
});
```

**验收标准**：
- [ ] 3 个 Profile 同时执行，全部成功
- [ ] 部分失败时，成功的不受影响
- [ ] 支持 maxConcurrency 限制
- [ ] 总延迟 < 单任务延迟 × 1.5（并行效率）

---

### 任务 4：实现指数退避重试

**目标**：错误自动恢复，非直接 fallback

**当前状态**：
- ✅ Fallback 降级（本地 Agent 兜底）
- ❌ 重试机制（指数退避）

**实现方案**：

```typescript
// packages/glue-service/src/thin-glue.ts
interface RetryConfig {
  maxRetries: number;        // 默认 3
  initialDelayMs: number;    // 默认 1000
  maxDelayMs: number;        // 默认 30000
  backoffMultiplier: number; // 默认 2
  retryableErrors: string[]; // 可重试错误码
}

class ThinGlue {
  private async executeWithRetry(
    request: TaskRequest,
    config: RetryConfig
  ): Promise<TaskResponse> {
    let lastError: Error;
    let delay = config.initialDelayMs;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        return await this.executeOnce(request);
      } catch (error) {
        lastError = error;
        if (!this.isRetryable(error) || attempt === config.maxRetries) {
          throw error;  // 不可重试或已达上限，抛给 fallback
        }
        await this.sleep(delay);
        delay = Math.min(delay * config.backoffMultiplier, config.maxDelayMs);
      }
    }
    throw lastError;
  }

  private isRetryable(error: Error): boolean {
    // 网络超时、连接失败、503 等可重试
    // 400、权限错误等不可重试
    return error.code === 'ECONNRESET' || 
           error.code === 'ETIMEDOUT' ||
           error.status === 503;
  }
}
```

**验收标准**：
- [ ] 网络超时自动重试，最多 3 次
- [ ] 延迟递增：1s → 2s → 4s
- [ ] 不可重试错误直接 fallback
- [ ] 测试覆盖：成功、1次重试成功、3次重试失败、不可重试错误

---

### 任务 5：会议版本快照

**目标**：会议结束后生成版本化快照

**当前状态**：
- ✅ 会议模式运行（多轮讨论 + 决议生成）
- ❌ `archivedVersion` 未实现（占位符）

**实现方案**：

```typescript
// packages/glue-service/src/thick-glue.ts
interface MeetingSnapshot {
  version: string;           // "v1.0", "v1.1"
  timestamp: Date;
  goal: string;
  participants: string[];
  comments: MeetingComment[];
  resolution: string;
  baseDocument?: Document;   // 如果有基础文档
  totalTokens: number;
  duration: number;
}

class ThickGlue {
  async runMeeting(request: MeetingRequest): Promise<MeetingResponse> {
    // ... 现有会议逻辑 ...

    // 生成快照
    const snapshot: MeetingSnapshot = {
      version: await this.generateVersion(request.goal),
      timestamp: new Date(),
      goal: request.goal,
      participants: activeAgents,
      comments: allComments,
      resolution: resolution,
      baseDocument: request.baseDocument,
      totalTokens: tokenTracker.getTotal(),
      duration: Date.now() - startTime,
    };

    // 保存到协作记忆（层2）
    await this.collaborationMemory.saveSnapshot(snapshot);

    return {
      ...response,
      archivedVersion: snapshot.version,  // 返回版本号
    };
  }

  private async generateVersion(goal: string): Promise<string> {
    // 查询该 goal 已有多少个快照
    const existing = await this.collaborationMemory.listSnapshots(goal);
    const nextVersion = existing.length + 1;
    return `v${nextVersion}.0`;
  }
}
```

**验收标准**：
- [ ] 同一 goal 的多次会议，版本递增（v1.0 → v1.1 → v1.2）
- [ ] 快照包含完整会议内容
- [ ] 可通过版本号查询历史会议
- [ ] 测试覆盖：首次会议、重复会议、版本查询

---

### 任务 6：基于文档的会议

**目标**：会议以文档为基础，Agent 对文档提评论

**当前状态**：
- ✅ 自由讨论会议（goal 驱动）
- ❌ 基于文档的会议（baseDocument 参数未支持）

**实现方案**：

```typescript
// packages/glue-service/src/thick-glue.ts
interface DocumentMeetingRequest {
  documentId: string;        // 项目文档 ID
  agenda: string;            // 讨论议题
  agents?: string[];        // 参与 Agent
  maxRounds?: number;       // 最多轮次
}

class ThickGlue {
  async runDocumentMeeting(request: DocumentMeetingRequest): Promise<MeetingResponse> {
    // 1. 读取基础文档
    const baseDoc = await this.projectMemory.getDocument(request.documentId);
    if (!baseDoc) throw new Error(`Document ${request.documentId} not found`);

    // 2. 将文档注入各 Agent 上下文
    const context = `## 讨论文档\n\n**标题**: ${baseDoc.title}\n\n**内容**:\n${baseDoc.content}\n\n**议题**: ${request.agenda}\n\n请针对以上文档和议题发表你的观点。`;

    // 3. 运行会议（复用现有会议逻辑）
    return this.runMeeting({
      goal: request.agenda,
      agents: request.agents,
      maxRounds: request.maxRounds,
      baseDocument: baseDoc,  // 传入基础文档
    });
  }
}
```

**验收标准**：
- [ ] 传入 documentId，会议围绕该文档展开
- [ ] Agent 评论针对文档内容，非自由发散
- [ ] 决议包含对文档的修改建议
- [ ] 测试覆盖：文档存在、文档不存在、评论针对性

---

## 三、下周完成（P2 — 工程化提升）

### 任务 7：补充测试到 80+

**目标**：提升覆盖率，补充缺失场景

**需要补充的测试**：

| 测试类型 | 数量 | 内容 |
|---------|------|------|
| 胶水层集成测试 | 5 | 薄胶水 + 厚胶水 + 路由协同 |
| 并发测试 | 3 | 多会议同时运行、并行任务冲突 |
| 性能测试 | 3 | 薄胶水延迟 < 500ms、会议模式 < 30s |
| 错误恢复测试 | 3 | Profile 崩溃、网络中断、超时 |
| Hermes 端到端测试 | 3 | 真实 Hermes 调用、自进化验证 |
| **新增总计** | **17** | **目标：67 → 84** |

**验收标准**：
- [ ] 测试总数 >= 80
- [ ] 覆盖率 > 70%
- [ ] 所有测试通过

---

### 任务 8：Langfuse 集成

**目标**：生产级可观测性

**实现方案**：

```typescript
// packages/glue-service/src/telemetry/langfuse-client.ts
import { Langfuse } from 'langfuse';

class TelemetryClient {
  private langfuse: Langfuse;

  constructor() {
    this.langfuse = new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_BASE_URL,
    });
  }

  async traceTaskExecution(request: TaskRequest, response: TaskResponse) {
    const trace = this.langfuse.trace({
      id: `task-${request.agentId}-${Date.now()}`,
      name: 'agent-task',
      metadata: {
        agentId: request.agentId,
        task: request.task.substring(0, 100),
      },
    });

    trace.generation({
      name: 'agent-execution',
      model: 'hermes',
      input: request.task,
      output: response.output,
      usage: {
        input: response.tokens,
        output: response.tokens,
        total: response.tokens * 2,
        unit: 'TOKENS',
        inputCost: response.tokens * 0.00001,
        outputCost: response.tokens * 0.00003,
        totalCost: response.tokens * 0.00004,
      },
    });
  }
}
```

**验收标准**：
- [ ] 每个任务在 Langfuse 有 Trace
- [ ] Token 消耗和成本自动计算
- [ ] Dashboard 可查看成本图表
- [ ] 支持告警阈值配置

---

### 任务 9：Docker 部署

**目标**：一键生产部署

**需要创建**：

```dockerfile
# Dockerfile.glue-service
FROM node:20-alpine
WORKDIR /app
COPY packages/glue-service/package.json ./
RUN npm install
COPY packages/glue-service/src ./src
EXPOSE 8400
CMD ["npm", "run", "dev"]
```

```dockerfile
# Dockerfile.hermes
FROM python:3.11-slim
RUN pip install hermes-agent
WORKDIR /workspace
EXPOSE 8081-8085
CMD ["hermes", "server", "--port", "8081"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  gateway:
    build: ./packages/gateway
    ports: ["8400:8400"]

  dashboard:
    build: ./packages/dashboard
    ports: ["3000:3000"]

  glue-service:
    build:
      context: .
      dockerfile: Dockerfile.glue-service
    environment:
      - HERMES_PROFILES=dev-frontend,dev-backend,dev-testing,dev-devops,dev-pm

  hermes-frontend:
    build:
      context: .
      dockerfile: Dockerfile.hermes
    command: ["hermes", "server", "--port", "8081", "--profile", "dev-frontend"]
    volumes:
      - hermes-frontend-data:/workspace

  # ... 其他 Hermes Profile

volumes:
  hermes-frontend-data:
  hermes-backend-data:
  # ...
```

**验收标准**：
- [ ] `docker-compose up -d` 一键启动所有服务
- [ ] 所有服务健康检查通过
- [ ] 完整工作流执行成功
- [ ] 数据持久化到 Volume

---

## 四、任务优先级总表

| 优先级 | 任务 | 预计时间 | 阻塞后续？ | 验收标准 |
|--------|------|---------|-----------|---------|
| **P0** | 任务 1：Hermes 端到端验证 | 1天 | **是** | 5个Profile启动，薄胶水调用成功，Skills自动生成 |
| **P0** | 任务 2：Profile 启动集成 | 0.5天 | **是** | `pnpm dev` 一键启动所有服务 |
| **P1** | 任务 3：executeParallel | 1天 | 否 | 3个Profile并行执行，部分失败不影响 |
| **P1** | 任务 4：指数退避重试 | 1天 | 否 | 网络超时自动重试，延迟递增 |
| **P1** | 任务 5：会议版本快照 | 0.5天 | 否 | 版本递增，可查询历史 |
| **P1** | 任务 6：基于文档的会议 | 1天 | 否 | Agent评论针对文档内容 |
| **P2** | 任务 7：测试 67→80+ | 2天 | 否 | 覆盖率>70%，全部通过 |
| **P2** | 任务 8：Langfuse 集成 | 2天 | 否 | 成本追踪可视化 |
| **P3** | 任务 9：Docker 部署 | 3天 | 否 | docker-compose up 一键启动 |

---

## 五、关键判断标准（给 CC 的提示）

### "完成"的定义

| 检查项 | 未完成 | 完成 |
|--------|--------|------|
| 代码存在 | ✅ 有文件 | ✅ 有文件 |
| 能运行 | ❌ 启动失败 | ✅ 启动成功 |
| 有测试 | ❌ 空测试 | ✅ 有断言 |
| 测试通过 | ❌ 失败/跳过 | ✅ 全部通过 |
| 端到端验证 | ❌ 仅单元测试 | ✅ 真实服务调用 |
| 文档同步 | ❌ 代码与文档不一致 | ✅ README/ADR/代码一致 |

### 特别注意

1. **Hermes 端到端验证是唯一的 P0**：代码接口就绪 ≠ 真实可用，必须启动 Python 进程验证
2. **测试必须真实运行**：`pnpm test` 输出截图或文本报告
3. **文档必须同步**：每完成一个任务，更新相关文档

---

*文档生成于 2026-06-17*
*用于指导 Claude Code 推进 DEV-Agent-Teams 项目至生产可用*
