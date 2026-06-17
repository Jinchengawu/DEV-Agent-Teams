# DEV-Agent-Teams 推进任务清单（给 Claude Code）

> 生成时间：2026-06-17
> 状态：基于当前代码（2026-06-17 提交）的验证与推进任务
> 目标：确认实现质量，补齐关键缺口，达到生产可用

---

## 一、紧急验证任务（今天完成）

### 任务 1：确认 Hermes 实际接入方式

**验证目标**：确认 `thin-glue.ts` 是否真实调用 Hermes API，而非本地 TS Agent

**验证方法**：
```bash
# 1. 查看 thin-glue.ts 核心逻辑
cat packages/glue-service/src/thin-glue.ts | head -100

# 2. 确认是否有以下模式之一：
# 模式 A（Hermes 已接入）：
#   fetch(`http://localhost:${port}/execute`)
#   或 axios.post(`http://localhost:${port}/chat`)
#
# 模式 B（本地 TS Agent，未接入 Hermes）：
#   this.agentFactory.execute(profile, task)
#   或 this.localAgent.run(task)
```

**验收标准**：
- [ ] 如果模式 A：Hermes 已接入，继续任务 2
- [ ] 如果模式 B：需要重新实现 Hermes 接入，标记为**高优先级**

**输出**：在代码注释中标注当前接入方式

---

### 任务 2：验证 Profile 生命周期管理

**验证目标**：确认 `profile-manager.ts` 能真实启动/停止 Hermes 进程

**验证方法**：
```bash
# 1. 查看 profile-manager.ts 核心逻辑
cat packages/glue-service/src/lifecycle/profile-manager.ts | head -150

# 2. 确认是否有以下功能：
#   - spawn('hermes', ['server', '--port', port, '--profile', name])
#   - 或 docker run hermes-agent:latest
#   - 健康检查（HTTP ping 或进程检查）
#   - 重启策略（指数退避）

# 3. 实际测试
pnpm dev
# 然后检查是否有 Hermes 进程在运行
ps aux | grep hermes
# 或
curl http://localhost:8081/status
```

**验收标准**：
- [ ] 能启动 5 个 Hermes Profile 进程（frontend/backend/testing/devops/pm）
- [ ] 每个 Profile 有独立端口（8081-8085）
- [ ] 健康检查通过
- [ ] 停止时能优雅关闭

**输出**：Profile 启动日志 + 健康检查截图

---

### 任务 3：验证测试真实性与覆盖率

**验证目标**：确认 58 个测试是否真实运行通过，而非空测试/占位符

**验证方法**：
```bash
# 1. 运行测试
pnpm test

# 2. 查看测试文件列表
find packages/ -name "*.test.ts" -o -name "*.spec.ts"

# 3. 抽查关键测试内容
cat packages/glue-service/src/thin-glue.test.ts
cat packages/glue-service/src/thick-glue.test.ts
cat packages/glue-service/src/lifecycle/profile-manager.test.ts
```

**验收标准**：
- [ ] 测试总数 >= 58
- [ ] 通过率 100%
- [ ] 关键路径有测试：薄胶水、厚胶水、Profile 生命周期、记忆分层
- [ ] 无空测试（`it('should work', () => {})`）

**输出**：测试运行报告（截图或文本）

---

## 二、核心功能验证（本周完成）

### 任务 4：验证薄胶水完整功能

**验证目标**：确认薄胶水能完成单 Agent 任务透传

**测试场景**：
```typescript
// 1. 单 Agent 简单任务
const result = await thinGlue.executeTask('dev-frontend', '创建一个登录按钮组件');
expect(result.status).toBe('success');
expect(result.output).toContain('LoginButton');

// 2. 批量并行任务
const results = await thinGlue.executeParallel([
  { profile: 'dev-frontend', task: '创建 header' },
  { profile: 'dev-backend', task: '创建 /api/user' },
]);
expect(results.get('dev-frontend').status).toBe('success');
expect(results.get('dev-backend').status).toBe('success');

// 3. 错误处理
const badResult = await thinGlue.executeTask('dev-frontend', 'invalid task');
expect(badResult.status).toBe('error');
expect(badResult.retryCount).toBeGreaterThan(0);
```

**验收标准**：
- [ ] 延迟 < 500ms (P95)
- [ ] 错误有重试机制
- [ ] 超时控制

---

### 任务 5：验证厚胶水（会议模式）

**验证目标**：确认会议模式能运行多 Agent 协作

**测试场景**：
```typescript
// 1. 创建会议
const meeting = await thickGlue.runMeeting({
  meetingId: 'meeting-001',
  baseDocument: {
    id: 'doc-001',
    title: '技术选型：缓存方案',
    content: '候选方案：Redis vs Postgres'
  },
  participants: ['dev-backend', 'dev-devops', 'dev-pm'],
  agenda: '讨论缓存方案选型'
});

// 2. 验证评论聚合
expect(meeting.comments.length).toBeGreaterThan(0);
expect(meeting.comments[0]).toHaveProperty('profile');
expect(meeting.comments[0]).toHaveProperty('content');

// 3. 验证决议生成
expect(meeting.resolution).toBeDefined();
expect(meeting.resolution.decision).toBeTruthy();
expect(meeting.resolution.reason).toBeTruthy();

// 4. 验证版本快照
expect(meeting.archivedVersion).toMatch(/v\d+\.\d+/);
```

**验收标准**：
- [ ] 5 个 Agent 能同时参与
- [ ] 评论正确聚合
- [ ] 决议生成合理
- [ ] 版本快照保存

---

### 任务 6：验证场景化记忆分层

**验证目标**：确认三层记忆真实工作

**层 1：项目锚定记忆**
```typescript
// 测试
doc = await memory.project.createDocument({
  projectId: 'proj-001',
  title: 'API Design',
  content: '...'
});
expect(doc.version).toBe('v1.0');

// 更新
docV2 = await memory.project.updateDocument(doc.id, { content: '...updated...' });
expect(docV2.version).toBe('v1.1');

// 读取历史版本
oldDoc = await memory.project.getDocument(doc.id, 'v1.0');
expect(oldDoc.version).toBe('v1.0');
```

**层 2：协作会话记忆**
```typescript
// 测试
session = await memory.session.createSession({
  sessionId: 'session-001',
  baseDoc: { ... }
});

await memory.session.addComment('session-001', 'dev-backend', '建议 Redis');
await memory.session.addComment('session-001', 'dev-devops', 'Redis 运维简单');

resolution = await memory.session.getResolution('session-001');
expect(resolution).toBeDefined();

await memory.session.archiveSession('session-001');
```

**层 3：Agent 个体记忆（只读桥接）**
```typescript
// 测试
skills = await memory.individual.listSkills('dev-frontend');
expect(skills.length).toBeGreaterThan(0);

memories = await memory.individual.searchMemory('dev-frontend', 'React component');
expect(memories.length).toBeGreaterThan(0);

// 验证：只读，不写回
// 尝试写回应该抛出错误或忽略
```

**验收标准**：
- [ ] 层 1：文档 CRUD + 版本化
- [ ] 层 2：评论 + 决议 + 归档
- [ ] 层 3：只读桥接，不破坏 Hermes 闭环

---

### 任务 7：验证工作流模式（已有功能回归测试）

**验证目标**：确认已有功能未被破坏

**测试场景**：
```typescript
// 1. 工作流编排
const result = await orchestrator.runTeam('开发量化交易系统');
expect(result.status).toBe('success');
expect(result.tasks.length).toBeGreaterThan(0);

// 2. 单 Agent 路由
const agentResult = await orchestrator.runAgent('dev-frontend', '创建登录组件');
expect(agentResult.status).toBe('success');

// 3. 显式任务列表
const taskResult = await orchestrator.runTasks([
  { agent: 'dev-pm', task: '写PRD' },
  { agent: 'dev-backend', task: '实现API', dependsOn: [0] },
]);
expect(taskResult[1].status).toBe('success');
```

**验收标准**：
- [ ] 所有已有功能正常运行
- [ ] 无回归错误

---

## 三、工程化补齐（下周完成）

### 任务 8：补充测试覆盖率

**目标**：从当前 ~58 个测试提升到 >80 个，覆盖所有关键路径

**需要补充的测试**：
- [ ] 胶水层集成测试（thin + thick + 路由）
- [ ] Profile 生命周期测试（启动/停止/重启/故障）
- [ ] 记忆分层测试（三层各自 + 跨层交互）
- [ ] 错误恢复测试（网络故障、Profile 崩溃、超时）
- [ ] 并发测试（多会议同时运行）
- [ ] 性能测试（薄胶水延迟 < 500ms）

**验收标准**：
- [ ] 测试总数 >= 80
- [ ] 覆盖率 > 70%
- [ ] 所有测试通过

---

### 任务 9：集成可观测性

**目标**：接入 Langfuse 或自建 Telemetry

**需要实现**：
- [ ] 每个 Agent 任务的 Token 消耗追踪
- [ ] 延迟追踪（薄胶水/厚胶水各自）
- [ ] 错误率追踪
- [ ] Dashboard 显示成本图表

**验收标准**：
- [ ] 能看到每个任务的成本
- [ ] 能看到 Profile 健康状态
- [ ] 告警阈值配置

---

### 任务 10：文档同步

**目标**：确保代码、文档、README 一致

**需要更新**：
- [ ] Open-Agent-Teams README：确认无 "OpenClaw" 残留
- [ ] DEV-Agent-Teams README：确认架构公式正确
- [ ] 胶水层 ADR：写入 docs/ADR-001.md
- [ ] API 文档：胶水层接口文档
- [ ] 部署文档：如何启动 Hermes Profile

**验收标准**：
- [ ] 新用户能根据 README 完整启动系统
- [ ] 架构图与实际代码一致

---

## 四、长期任务（本月完成）

### 任务 11：Hermes 自进化验证

**目标**：确认 Hermes 的 Reflective Phase 能自动创建/改进 Skills

**验证方法**：
```bash
# 1. 让 dev-frontend 执行 10 个 React 组件任务
# 2. 检查是否自动生成 Skills
ls workspaces/frontend/skills/
# 期望看到新技能文件，如 react-component-patterns.md

# 3. 检查 MEMORY.md 是否有更新
cat workspaces/frontend/MEMORY.md
```

**验收标准**：
- [ ] 执行多个任务后，Skills 目录有新文件
- [ ] 新任务能复用已生成的 Skills
- [ ] 性能提升（复用 Skills 后延迟降低）

---

### 任务 12：生产部署验证

**目标**：确认系统能在 Docker 中完整运行

**验证方法**：
```bash
# 1. Docker Compose 启动
docker-compose up -d

# 2. 检查所有服务健康
docker-compose ps
curl http://localhost:8400/health
curl http://localhost:3000
curl http://localhost:8081/status  # Hermes frontend
curl http://localhost:8082/status  # Hermes backend

# 3. 执行完整工作流
curl -X POST http://localhost:8400/api/team/run   -H "Content-Type: application/json"   -d '{"goal": "开发一个简单的登录系统"}'
```

**验收标准**：
- [ ] 所有服务启动无错误
- [ ] 完整工作流执行成功
- [ ] 结果可查看（Dashboard）

---

## 五、任务优先级总结

| 优先级 | 任务 | 预计时间 | 阻塞后续？ |
|--------|------|---------|---------|
| **P0** | 任务 1：确认 Hermes 接入方式 | 30分钟 | **是**（影响所有后续任务） |
| **P0** | 任务 2：验证 Profile 生命周期 | 1小时 | **是** |
| **P0** | 任务 3：验证测试真实性 | 30分钟 | 否 |
| **P1** | 任务 4-7：核心功能验证 | 2-3天 | 否 |
| **P2** | 任务 8-10：工程化补齐 | 3-5天 | 否 |
| **P3** | 任务 11-12：长期验证 | 1-2周 | 否 |

---

## 六、关键判断标准

### "真实现" vs "假实现" 检查清单

| 检查项 | 假实现（骨架） | 真实现（可用） |
|--------|-------------|---------------|
| 文件存在 | ✅ 有文件 | ✅ 有文件 |
| 有实际代码 | ❌ 空函数/注释 | ✅ 有业务逻辑 |
| 能运行 | ❌ 启动失败 | ✅ 启动成功 |
| 有测试 | ❌ 空测试 | ✅ 有断言 |
| 测试通过 | ❌ 失败/跳过 | ✅ 全部通过 |
| 能处理真实输入 | ❌ 硬编码返回 | ✅ 动态处理 |
| 有错误处理 | ❌ 无 try-catch | ✅ 有重试/降级 |

**请用以上标准逐一验证每个任务。**

---

*文档生成于 2026-06-17*
*用于指导 Claude Code 推进 DEV-Agent-Teams 项目*
