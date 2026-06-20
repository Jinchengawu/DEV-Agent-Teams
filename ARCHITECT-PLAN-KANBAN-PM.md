# 架构师计划书 — 阶段：项目管理员 Agent + 看板模块

> **角色分工**：本计划由 Kimi（架构师）设计，Claude Code（CC）执行代码实现。  
> **目标受众**：CC（执行者），不需要理解全局架构，只需按步骤执行。  
> **执行环境**：DEV-Agent-Teams 仓库  
> **仓库路径**：`/Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams`

---

## 一、需求概述

在现有 DEV-Agent-Teams 基础上新增两个组件：

1. **项目管理员 Agent** (`project-admin`) — 统筹项目进度、任务分配、里程碑管理
2. **看板模块** — 可视化跟踪所有 Agent 的任务进度、状态和相互关系

> **注意**：现有 `dev-pm`（产品经理）保留，负责需求/PRD。`project-admin` 是新角色，专管进度。

---

## 二、架构设计

### 2.1 整体结构

```
DEV-Agent-Teams/
├── packages/
│   ├── agents/
│   │   ├── frontend/     (port 8201)
│   │   ├── backend/      (port 8202)
│   │   ├── testing/      (port 8203)
│   │   ├── devops/       (port 8204)
│   │   ├── pm/           (port 8205) — 产品经理（保留）
│   │   └── project-admin/ (port 8206) — 项目管理员（新增）⬅️
│   ├── core/
│   │   ├── session/
│   │   │   └── schema.ts — 新增 tasks/milestones 表 ⬅️
│   │   └── ...
│   ├── gateway/
│   │   └── src/api-gateway.ts — 注册 project-admin (port 8206) ⬅️
│   └── dashboard/
│       ├── src/app/api/kanban/route.ts — 看板 API ⬅️
│       ├── src/app/api/milestones/route.ts — 里程碑 API ⬅️
│       ├── src/app/api/kanban/tasks/route.ts — 任务 CRUD API ⬅️
│       ├── src/app/kanban/page.tsx — 看板页面 ⬅️
│       ├── src/components/NavBar.tsx — 导航栏添加看板入口 ⬅️
│       └── src/lib/agents.ts — 添加 project-admin 配置 ⬅️
└── scripts/
    └── quick-regression.sh — 更新为 6 Agent 测试 ⬅️
```

### 2.2 数据模型

#### 新增表：`tasks`（任务表）

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
  assignee    TEXT NOT NULL DEFAULT '',        -- agent_id, 如 'dev-frontend'
  priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
  task_type   TEXT NOT NULL DEFAULT 'feature' CHECK(task_type IN ('feature', 'bug', 'refactor', 'test', 'deploy', 'doc')),
  session_id  TEXT,                             -- 关联的会话
  milestone_id TEXT,                            -- 关联的里程碑
  parent_id   TEXT,                             -- 父任务（支持子任务）
  progress    INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
  tags        TEXT,                             -- JSON 数组
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  due_at      TEXT,                             -- 截止日期
  completed_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
```

#### 新增表：`milestones`（里程碑表）

```sql
CREATE TABLE IF NOT EXISTS milestones (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'overdue', 'cancelled')),
  target_date TEXT NOT NULL,                    -- 目标日期
  completed_at TEXT,
  progress    INTEGER NOT NULL DEFAULT 0,       -- 根据关联任务自动计算
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
```

#### 状态流转图

```
tasks.status:
  todo → in_progress → review → done
  todo → blocked → in_progress (解封后)
  in_progress → blocked → in_progress

milestones.status:
  active → completed (所有关联任务 done)
  active → overdue (target_date < now, 未 completed)
  active → cancelled (手动取消)
```

### 2.3 API 设计

#### 看板汇总 API

```
GET /api/kanban

Response:
{
  "tasks": [
    { "id": "task-001", "title": "登录组件", "status": "in_progress", "assignee": "dev-frontend", "priority": "high", "progress": 60, ... }
  ],
  "milestones": [
    { "id": "ms-001", "title": "MVP 发布", "status": "active", "target_date": "2026-06-30", "progress": 45 }
  ],
  "agent_stats": {
    "dev-frontend": { "total": 5, "todo": 2, "in_progress": 2, "done": 1, "blocked": 0 },
    "dev-backend": { "total": 3, "todo": 1, "in_progress": 1, "done": 1, "blocked": 0 },
    ...
  },
  "summary": {
    "total_tasks": 12,
    "completed": 3,
    "blocked": 1,
    "overdue": 0,
    "active_milestones": 2
  }
}
```

#### 任务 CRUD API

```
GET    /api/kanban/tasks          — 列出任务（支持 ?status=, ?assignee=, ?milestone_id= 过滤）
POST   /api/kanban/tasks          — 创建任务
GET    /api/kanban/tasks/[id]     — 获取单个任务
PUT    /api/kanban/tasks/[id]     — 更新任务
DELETE /api/kanban/tasks/[id]     — 删除任务

POST 请求体:
{
  "title": "登录表单",
  "description": "实现用户登录表单",
  "status": "todo",
  "assignee": "dev-frontend",
  "priority": "high",
  "task_type": "feature",
  "milestone_id": "ms-001",
  "parent_id": null,
  "due_at": "2026-06-25T00:00:00Z"
}
```

#### 里程碑 API

```
GET    /api/milestones           — 列出里程碑
POST   /api/milestones           — 创建里程碑
PUT    /api/milestones/[id]     — 更新里程碑
DELETE /api/milestones/[id]     — 删除里程碑
```

### 2.4 项目管理员 Agent 设计

```typescript
// packages/agents/project-admin/src/index.ts
export const agentConfig = {
  id: 'project-admin',
  name: 'Project Admin',
  role: '项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调',
  port: parseInt(process.env.PROJECT_ADMIN_AGENT_PORT || '8206'),
  skills: [
    'project-management',
    'task-assignment',
    'milestone-tracking',
    'progress-reporting',
    'agent-coordination',
    'kanban-management',
    'risk-identification',
    'deadline-monitoring',
  ],
  tags: ['project', 'admin', 'kanban', 'milestone', 'progress', 'task', 'pm', '管理'],
};
```

**Agent 角色描述**（system prompt）：

> 你是 Project Admin Agent，DEV-Agent-Teams 的项目管理员。你的职责：
> 1. **任务管理**：根据会话内容自动识别任务，在看板中创建任务条目，分配给合适的 Agent
> 2. **进度跟踪**：监控各 Agent 的任务完成进度，当任务逾期或阻塞时发出提醒
> 3. **里程碑协调**：管理里程碑目标，关联任务到里程碑，自动计算里程碑完成百分比
> 4. **Agent 关系协调**：在 Team 模式下，协调各 Agent 的工作顺序，避免资源冲突
> 5. **报告生成**：生成项目状态报告、燃尽图数据、进度摘要
> 
> 工具：
> - `create_task`：创建看板任务
> - `update_task`：更新任务状态/进度
> - `assign_task`：将任务分配给 Agent
> - `create_milestone`：创建里程碑
> - `get_kanban_status`：获取看板状态
> - `generate_report`：生成进度报告

---

## 三、给 CC 的执行计划书

### 前置检查（执行前必做）

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams

# 1. 确认所有 Agent 停止（避免端口冲突）
./dev-agent stop 2>/dev/null || true
for p in 8201 8202 8203 8204 8205 8206; do
  lsof -i :$p | grep LISTEN | awk '{print $2}' | xargs kill -9 2>/dev/null || true
done

# 2. 确认 port 8206 空闲
lsof -i :8206 | grep LISTEN || echo "port 8206 free ✅"

# 3. 确认 pnpm 和数据库可用
pnpm -v
sqlite3 ~/.dev-agent/data/sessions.db "SELECT 1;"
```

---

### 模块 1：创建 project-admin Agent

**工作目录**：`cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams`

#### 步骤 1.1：创建 Agent 目录和文件

```bash
mkdir -p packages/agents/project-admin/src
```

文件：`packages/agents/project-admin/src/index.ts`

内容（复制现有 `pm` Agent 结构，修改角色和端口）：

```typescript
/**
 * Project Admin Agent
 *
 * 项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调。
 */

import { createServer } from 'node:http';

export const agentConfig = {
  id: 'project-admin',
  name: 'Project Admin',
  role: '项目管理员 — 统筹进度、任务分配、里程碑跟踪、Agent 协作协调。擅长：看板管理、里程碑规划、进度监控、风险识别、跨 Agent 任务协调。',
  port: parseInt(process.env.PROJECT_ADMIN_AGENT_PORT || '8206'),
  skills: [
    'project-management',
    'task-assignment',
    'milestone-tracking',
    'progress-reporting',
    'agent-coordination',
    'kanban-management',
    'risk-identification',
    'deadline-monitoring',
  ],
  tags: [
    'project', 'admin', 'kanban', 'milestone', 'progress',
    'task', 'pm', '管理', '进度', '里程碑', '协调', '分配',
  ],
};

const server = createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', agent: agentConfig.id, port: agentConfig.port }));
});

server.listen(agentConfig.port, () => {
  console.log(`🚀 ${agentConfig.name} listening on port ${agentConfig.port}`);
});

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
```

#### 步骤 1.2：创建 package.json

文件：`packages/agents/project-admin/package.json`

```json
{
  "name": "@dev-agent/project-admin",
  "version": "0.1.0",
  "description": "Project Admin Agent — 项目进度管理",
  "type": "module",
  "main": "src/index.ts",
  "scripts": {
    "dev": "tsx src/index.ts",
    "check": "tsc --noEmit"
  },
  "dependencies": {
    "@dev-agent/core": "file:../../core"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.0"
  }
}
```

#### 步骤 1.3：添加到 pnpm-workspace.yaml

当前文件已有 `packages/agents/*`，所以不需要修改。但需要在根目录执行 `pnpm install` 让 pnpm 识别新包。

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams
pnpm install
```

---

### 模块 2：注册 project-admin 到系统

#### 步骤 2.1：更新 `packages/dashboard/src/lib/agents.ts`

在 `AGENTS` 对象中添加 `project-admin`：

```typescript
export const AGENTS: Record<string, AgentInfo> = {
  // ... 现有 5 个 Agent 保留
  'project-admin': {
    id: 'project-admin',
    name: 'Project Admin',
    label: '项目管理员 Agent',
    icon: '📊',
    color: 'from-indigo-500 to-indigo-600',
    tags: ['project', 'admin', 'kanban', 'milestone', 'progress', 'task', 'pm', '管理'],
  },
};
```

#### 步骤 2.2：更新 `packages/gateway/src/api-gateway.ts`（如果需要）

检查 Gateway 如何注册 Agent。如果 Agent 注册是动态读取的（从 `dev-agent` 脚本或配置文件），更新注册文件。如果硬编码在代码中，在 Gateway 中新增 Agent 配置。

先检查 Gateway 中 Agent 的注册方式：

```bash
grep -n "dev-pm\|8205\|agents" /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/gateway/src/api-gateway.ts | head -20
```

根据实际注册方式，添加 `project-admin`（port 8206）。

#### 步骤 2.3：更新 `.env` 或环境变量

添加环境变量（如果 Gateway 或 Agent 使用）：

```bash
PROJECT_ADMIN_AGENT_PORT=8206
```

#### 步骤 2.4：更新 `dev-agent` 启动脚本

检查 `dev-agent` 脚本（根目录）如何启动各 Agent。找到启动 5 个 Agent 的逻辑，添加 `project-admin`：

```bash
cat /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/dev-agent | head -100
```

在启动脚本中添加 `project-admin` 的启动命令。参考现有 5 个 Agent 的启动方式。

---

### 模块 3：数据库表新增

**工作目录**：`cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/core`

#### 步骤 3.1：修改 `packages/core/src/session/schema.ts`

在 `initSchema` 函数中添加 `tasks` 和 `milestones` 表的创建逻辑。

先查看现有 schema.ts 内容：

```bash
cat /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/core/src/session/schema.ts
```

在现有 `initSchema` 中，追加以下 SQL（放在 `PRAGMA foreign_keys = ON;` 之后，或现有 `CREATE TABLE` 之后）：

```typescript
// 追加到 initSchema 中
const CREATE_TABLES = `
  -- 现有 sessions 和 messages 表保留
  CREATE TABLE IF NOT EXISTS sessions (...);
  CREATE TABLE IF NOT EXISTS messages (...);
  
  -- 新增 tasks 表
  CREATE TABLE IF NOT EXISTS tasks (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'review', 'done', 'blocked')),
    assignee    TEXT NOT NULL DEFAULT '',
    priority    TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'critical')),
    task_type   TEXT NOT NULL DEFAULT 'feature' CHECK(task_type IN ('feature', 'bug', 'refactor', 'test', 'deploy', 'doc')),
    session_id  TEXT,
    milestone_id TEXT,
    parent_id   TEXT,
    progress    INTEGER NOT NULL DEFAULT 0 CHECK(progress >= 0 AND progress <= 100),
    tags        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
    due_at      TEXT,
    completed_at TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee);
  CREATE INDEX IF NOT EXISTS idx_tasks_milestone ON tasks(milestone_id);
  
  -- 新增 milestones 表
  CREATE TABLE IF NOT EXISTS milestones (
    id          TEXT PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'overdue', 'cancelled')),
    target_date TEXT NOT NULL,
    completed_at TEXT,
    progress    INTEGER NOT NULL DEFAULT 0,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_milestones_status ON milestones(status);
  CREATE INDEX IF NOT EXISTS idx_milestones_target_date ON milestones(target_date);
`;
```

#### 步骤 3.2：验证数据库迁移

由于 SQLite 是 Schema-on-creation，已存在的数据库不会自动创建新表。需要处理已有数据库的迁移：

**方案 A（推荐）**：运行时检查并创建表。在 `initSchema` 中，现有逻辑是 `CREATE TABLE IF NOT EXISTS`，所以已经支持自动创建。但已有运行的数据库需要重启 Gateway 让 `initSchema` 重新执行。

**方案 B**：手动执行迁移：

```bash
sqlite3 ~/.dev-agent/data/sessions.db < /tmp/migration.sql
```

其中 `/tmp/migration.sql` 包含所有 `CREATE TABLE IF NOT EXISTS` 和 `CREATE INDEX` 语句。

#### 步骤 3.3：验证表创建成功

```bash
sqlite3 ~/.dev-agent/data/sessions.db ".tables"
# 预期输出包含：sessions, messages, tasks, milestones

sqlite3 ~/.dev-agent/data/sessions.db ".schema tasks"
sqlite3 ~/.dev-agent/data/sessions.db ".schema milestones"
```

---

### 模块 4：Dashboard API 路由

#### 步骤 4.1：创建 `packages/dashboard/src/app/api/kanban/route.ts`

文件：`packages/dashboard/src/app/api/kanban/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const DB_PATH = process.env.SESSION_DB_PATH || '/Users/zhuizhui/.dev-agent/data/sessions.db';

export async function GET() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const tasks = db.prepare('SELECT * FROM tasks ORDER BY updated_at DESC').all();
    const milestones = db.prepare('SELECT * FROM milestones ORDER BY target_date ASC').all();
    
    // 按 Agent 统计
    const agentStats = db.prepare(`
      SELECT assignee, 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked
      FROM tasks
      WHERE assignee != ''
      GROUP BY assignee
    `).all();
    
    const total = tasks.length;
    const completed = tasks.filter((t: any) => t.status === 'done').length;
    const blocked = tasks.filter((t: any) => t.status === 'blocked').length;
    const overdue = tasks.filter((t: any) => t.due_at && t.due_at < new Date().toISOString() && t.status !== 'done').length;
    
    return NextResponse.json({
      tasks,
      milestones,
      agent_stats: agentStats.reduce((acc: any, row: any) => {
        acc[row.assignee] = row;
        return acc;
      }, {}),
      summary: { total_tasks: total, completed, blocked, overdue, active_milestones: milestones.filter((m: any) => m.status === 'active').length }
    });
  } finally {
    db.close();
  }
}
```

#### 步骤 4.2：创建 `packages/dashboard/src/app/api/kanban/tasks/route.ts`

文件：`packages/dashboard/src/app/api/kanban/tasks/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.SESSION_DB_PATH || '/Users/zhuizhui/.dev-agent/data/sessions.db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const assignee = searchParams.get('assignee');
  const milestoneId = searchParams.get('milestone_id');
  
  const db = new Database(DB_PATH, { readonly: true });
  try {
    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params: any[] = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (assignee) { query += ' AND assignee = ?'; params.push(assignee); }
    if (milestoneId) { query += ' AND milestone_id = ?'; params.push(milestoneId); }
    query += ' ORDER BY updated_at DESC';
    
    const tasks = db.prepare(query).all(...params);
    return NextResponse.json({ tasks });
  } finally {
    db.close();
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = randomUUID();
  
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      INSERT INTO tasks (id, title, description, status, assignee, priority, task_type, milestone_id, parent_id, due_at, tags)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.title || '',
      body.description || '',
      body.status || 'todo',
      body.assignee || '',
      body.priority || 'medium',
      body.task_type || 'feature',
      body.milestone_id || null,
      body.parent_id || null,
      body.due_at || null,
      body.tags ? JSON.stringify(body.tags) : null
    );
    return NextResponse.json({ id, ...body }, { status: 201 });
  } finally {
    db.close();
  }
}
```

#### 步骤 4.3：创建 `packages/dashboard/src/app/api/kanban/tasks/[id]/route.ts`

文件：`packages/dashboard/src/app/api/kanban/tasks/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';

const DB_PATH = process.env.SESSION_DB_PATH || '/Users/zhuizhui/.dev-agent/data/sessions.db';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
    if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json(task);
  } finally {
    db.close();
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const db = new Database(DB_PATH);
  try {
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(params.id);
    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
    
    const completedAt = body.status === 'done' && existing.status !== 'done' ? new Date().toISOString() : existing.completed_at;
    
    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        assignee = COALESCE(?, assignee),
        priority = COALESCE(?, priority),
        task_type = COALESCE(?, task_type),
        milestone_id = COALESCE(?, milestone_id),
        parent_id = COALESCE(?, parent_id),
        progress = COALESCE(?, progress),
        tags = COALESCE(?, tags),
        due_at = COALESCE(?, due_at),
        completed_at = COALESCE(?, completed_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      body.title, body.description, body.status, body.assignee, body.priority,
      body.task_type, body.milestone_id, body.parent_id, body.progress,
      body.tags ? JSON.stringify(body.tags) : null, body.due_at, completedAt, params.id
    );
    return NextResponse.json({ id: params.id, ...body });
  } finally {
    db.close();
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH);
  try {
    db.prepare('DELETE FROM tasks WHERE id = ?').run(params.id);
    return NextResponse.json({ deleted: params.id });
  } finally {
    db.close();
  }
}
```

#### 步骤 4.4：创建 `packages/dashboard/src/app/api/milestones/route.ts`

文件：`packages/dashboard/src/app/api/milestones/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.SESSION_DB_PATH || '/Users/zhuizhui/.dev-agent/data/sessions.db';

export async function GET() {
  const db = new Database(DB_PATH, { readonly: true });
  try {
    const milestones = db.prepare('SELECT * FROM milestones ORDER BY target_date ASC').all();
    return NextResponse.json({ milestones });
  } finally {
    db.close();
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const id = randomUUID();
  
  const db = new Database(DB_PATH);
  try {
    db.prepare(`
      INSERT INTO milestones (id, title, description, target_date)
      VALUES (?, ?, ?, ?)
    `).run(id, body.title || '', body.description || '', body.target_date || '');
    return NextResponse.json({ id, ...body }, { status: 201 });
  } finally {
    db.close();
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const body = await request.json();
  const db = new Database(DB_PATH);
  try {
    const existing = db.prepare('SELECT * FROM milestones WHERE id = ?').get(params.id);
    if (!existing) return NextResponse.json({ error: 'not found' }, { status: 404 });
    
    const completedAt = body.status === 'completed' && existing.status !== 'completed' ? new Date().toISOString() : existing.completed_at;
    
    db.prepare(`
      UPDATE milestones SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        status = COALESCE(?, status),
        target_date = COALESCE(?, target_date),
        completed_at = COALESCE(?, completed_at),
        updated_at = datetime('now')
      WHERE id = ?
    `).run(body.title, body.description, body.status, body.target_date, completedAt, params.id);
    return NextResponse.json({ id: params.id, ...body });
  } finally {
    db.close();
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const db = new Database(DB_PATH);
  try {
    db.prepare('DELETE FROM milestones WHERE id = ?').run(params.id);
    return NextResponse.json({ deleted: params.id });
  } finally {
    db.close();
  }
}
```

---

### 模块 5：Dashboard 看板页面 + 导航栏

#### 步骤 5.1：创建看板页面

文件：`packages/dashboard/src/app/kanban/page.tsx`

页面内容参考现有 `page.tsx` 或 `workflows/page.tsx` 的风格。需要展示：
- 左侧：任务看板（按状态列：todo / in_progress / review / done / blocked）
- 右侧：里程碑时间线
- 顶部：统计卡片（总任务、已完成、阻塞、逾期、活跃里程碑）
- 底部：Agent 工作量分布

参考现有页面的样式和组件导入方式。

**建议**：先查看现有 `workflows/page.tsx` 或 `sessions/page.tsx` 了解页面结构，然后复制并修改。

```bash
cat /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/app/sessions/page.tsx
```

看板页面核心功能：
- 使用 `fetch('/api/kanban')` 获取数据
- 使用 `fetch('/api/kanban/tasks', { method: 'POST', body: ... })` 创建任务
- 拖拽更改任务状态（可选，后续优化）
- 里程碑列表和进度条

#### 步骤 5.2：更新导航栏

文件：`packages/dashboard/src/components/NavBar.tsx`

查看现有导航栏结构，添加看板入口。

```bash
cat /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/components/NavBar.tsx
```

在导航栏中添加：

```tsx
// 在看板页面存在时添加
{ path: '/kanban', label: '看板', icon: '📊' }
```

---

### 模块 6：更新回归测试脚本

#### 步骤 6.1：更新 `scripts/quick-regression.sh`

将 Agent 健康检查从 5 个改为 6 个（新增 8206）：

```bash
# 修改循环中的端口列表
for port in 8201 8202 8203 8204 8205 8206; do
  echo -n "Agent port $port: "
  ...
done
```

#### 步骤 6.2：更新 `REGRESSION-TEST.md`

将文档中所有提到 "5 个 Agent" 的地方改为 "6 个 Agent"，port 8206 添加到列表中。

---

## 四、验收方案

### 验收清单

| 编号 | 验收项 | 检查命令 | 通过标准 |
|------|--------|----------|----------|
| TC-01 | project-admin 文件存在 | `ls packages/agents/project-admin/src/index.ts` | 文件存在 |
| TC-02 | project-admin 包配置 | `cat packages/agents/project-admin/package.json \| grep project-admin` | 包含正确名称 |
| TC-03 | 数据库表存在 | `sqlite3 sessions.db ".tables" \| grep tasks` | 输出包含 `tasks` 和 `milestones` |
| TC-04 | tasks 表结构正确 | `sqlite3 sessions.db ".schema tasks"` | 包含所有列 |
| TC-05 | milestones 表结构正确 | `sqlite3 sessions.db ".schema milestones"` | 包含所有列 |
| TC-06 | Gateway 注册 6 Agent | `curl http://localhost:8400/health` | `agents: 6` |
| TC-07 | project-admin 健康 | `curl http://localhost:8206/` | 返回 `status: ok` |
| TC-08 | 看板 API 可用 | `curl http://localhost:3000/api/kanban` | 返回 JSON，包含 `tasks`、`milestones`、`summary` |
| TC-09 | 任务创建 API | `POST /api/kanban/tasks` | 返回 201，创建成功 |
| TC-10 | 里程碑创建 API | `POST /api/milestones` | 返回 201，创建成功 |
| TC-11 | 看板页面可访问 | `curl http://localhost:3000/kanban` | 返回 HTML（200） |
| TC-12 | 导航栏有看板入口 | `grep -i kanban packages/dashboard/src/components/NavBar.tsx` | 包含 `kanban` 或 `看板` |
| TC-13 | 6 Agent 全部在线 | 循环 `curl http://localhost:820{1-6}/` | 全部返回 `ok` |
| TC-14 | 快速回归测试 | `bash scripts/quick-regression.sh` | 6/6 通过 |
| TC-15 | Team 模式包含 6 Agent | `curl POST /v1/chat/completions mode=team` | 返回包含所有 Agent 输出 |

### 快速验收脚本

```bash
#!/usr/bin/env bash
# kanban-acceptance.sh

set -e
GATEWAY="http://localhost:8400"
DASHBOARD="http://localhost:3000"
PASS=0; FAIL=0

check() {
  local desc="$1" cmd="$2" expected="$3"
  local result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo "  ✅ $desc"; ((PASS++)) || true
  else
    echo "  ❌ $desc"; echo "     期望: $expected"; echo "     实际: $result"; ((FAIL++)) || true
  fi
}

echo "📊 Kanban + PM Agent 验收测试"
echo "==============================="

check "TC-06 Gateway agents=6" "curl -s $GATEWAY/health | grep 'agents'" "6"
check "TC-07 project-admin 在线" "curl -s http://localhost:8206/ | grep status" "ok"
check "TC-08 看板 API" "curl -s $DASHBOARD/api/kanban | grep summary" "summary"
check "TC-12 导航栏看板入口" "grep -i kanban /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/components/NavBar.tsx 2>&1" "kanban"

echo ""
echo "📊 结果: $PASS 通过, $FAIL 失败"
[ "$FAIL" -eq 0 ] && echo "🏁 验收通过" || echo "❌ 验收未通过"
```

---

## 五、执行顺序（给 CC）

**按以下顺序执行，不可跳过**：

1. **前置检查** — 停止所有服务，确认 8206 空闲
2. **模块 1** — 创建 project-admin Agent（目录 + 文件 + package.json）
3. **模块 2** — 注册到系统（lib/agents.ts + gateway + dev-agent 脚本 + .env）
4. **模块 3** — 数据库表新增（schema.ts + 迁移执行）
5. **模块 4** — Dashboard API 路由（kanban + tasks + milestones）
6. **模块 5** — Dashboard 页面（kanban/page.tsx + NavBar.tsx）
7. **模块 6** — 更新回归测试（quick-regression.sh + REGRESSION-TEST.md）
8. **启动验证** — 启动所有服务，运行验收脚本

---

## 六、风险与回退

### 风险 1：数据库已存在，新表不会自动创建

**现象**：`initSchema` 在已有数据库上不会重新创建表。  
**解决**：手动执行迁移 SQL：

```bash
sqlite3 ~/.dev-agent/data/sessions.db <<EOF
CREATE TABLE IF NOT EXISTS tasks (...);
CREATE TABLE IF NOT EXISTS milestones (...);
CREATE INDEX IF NOT EXISTS ...;
EOF
```

### 风险 2：Dashboard 端口 3000 被占用

**现象**：Next.js 开发服务器启动失败。  
**解决**：先 `kill -9` 占用进程，或使用 `pnpm dev -- -p 3001` 临时改端口。

### 风险 3：project-admin 与 dev-pm 混淆

**现象**：用户可能分不清 `dev-pm`（产品经理）和 `project-admin`（项目管理员）。  
**预防**：在 Agent 配置中明确区分角色描述，在 Dashboard 中展示不同的图标和标签。

---

**版本**：v1.0  
**设计**：Kimi（架构师）  
**执行**：Claude Code（CC）  
**日期**：2026-06-18
