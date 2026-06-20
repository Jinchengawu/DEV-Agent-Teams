# 架构师计划书 — P0 致命短板补齐：代码执行 + 文件上传 + Git + 用户系统

> **角色分工**：本计划由 Kimi（架构师）设计，Claude Code（CC）执行代码实现。  
> **目标受众**：CC（执行者），不需要理解全局架构，只需按步骤执行。  
> **执行环境**：DEV-Agent-Teams 仓库  
> **仓库路径**：`/Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams`  
> **优先级**：P0（致命短板），不做完产品无法闭环交付

---

## 一、概述与目标

基于产品审计报告，当前四大致命短板：

1. **Agent 代码无法执行** — 只能看文本，不能预览、运行、部署
2. **无文件/多模态输入** — 只能发文本，不能上传设计稿、PDF、截图
3. **无 Git 版本控制** — 多 Agent 协作产出无版本管理、无法合并
4. **无用户系统** — 无登录、无权限、无项目隔离、无法商业化

本计划补齐以上四个短板，使 DEV-Agent-Teams 从"聊天工具"升级为"可交付的 AI 开发平台"。

---

## 二、架构总览

```
DEV-Agent-Teams/
├── packages/
│   ├── core/
│   │   └── session/
│   │       └── schema.ts          ── 新增 users, snapshots, attachments 表
│   ├── gateway/
│   │   └── src/
│   │       └── api-gateway.ts     ── 新增 /upload, /execute, /snapshots 端点
│   ├── dashboard/
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── api/
│   │   │   │   │   ├── upload/route.ts          ── 文件上传 API
│   │   │   │   │   ├── snapshots/route.ts       ── 代码快照 API
│   │   │   │   │   └── execute/route.ts         ── 代码执行 API（V2）
│   │   │   │   ├── chat/page.tsx                ── 新增文件上传按钮、预览面板
│   │   │   │   ├── sign-in/[[...sign-in]]/page.tsx ── Clerk 登录页
│   │   │   │   └── sign-up/[[...sign-up]]/page.tsx ── Clerk 注册页
│   │   │   └── components/
│   │   │       ├── CodePreview.tsx              ── 代码预览组件（iframe + blob）
│   │   │       ├── FileUpload.tsx               ── 文件上传组件
│   │   │       ├── SnapshotPanel.tsx            ── 快照管理面板
│   │   │       └── NavBar.tsx                   ── 新增用户头像/登出
│   │   └── middleware.ts                        ── Clerk 路由保护
│   └── agents/
│       └── project-admin/                       ── 已有（进度管理）
├── uploads/                                     ── 文件上传存储目录
└── scripts/
    └── quick-regression.sh                       ── 更新为 6 Agent 测试
```

---

## 三、模块 M1: 代码执行沙箱（前端实时预览）

### 3.1 设计决策

| 维度 | 方案 | 选择 |
|------|------|------|
| 前端预览 | Sandpack / WebContainer / iframe+blob | **iframe + blob URL**（零依赖，最轻量） |
| 后端执行 | Docker / Node.js 子进程 | V2 阶段再做，当前先做前端 |
| 安全 | CSP / iframe sandbox | `sandbox="allow-scripts"` |

**核心原理**：
```
Agent 返回 HTML/React 代码
  → 提取代码块
  → 包装为完整 HTML 字符串（注入 React/Vue CDN）
  → 创建 Blob URL
  → iframe 加载预览
```

### 3.2 执行步骤

#### 步骤 M1.1：创建 `CodePreview` 组件

文件：`packages/dashboard/src/components/CodePreview.tsx`

```tsx
'use client';

import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface CodePreviewProps {
  code: string;
  language?: string;
}

export default function CodePreview({ code, language = 'html' }: CodePreviewProps) {
  const [visible, setVisible] = useState(false);

  const blobUrl = useMemo(() => {
    if (!code || !visible) return null;
    let html = code;
    
    // 如果代码是 JSX/TSX 而非完整 HTML，包装为完整 HTML
    if (language === 'jsx' || language === 'tsx' || language === 'react') {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;padding:16px;font-family:sans-serif;}</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
${code}
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<App />);
  </script>
</body>
</html>`;
    }
    
    // 如果代码是 HTML 片段而非完整文档，包装为完整 HTML
    else if (!code.includes('<!DOCTYPE') && !code.includes('<html')) {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body{margin:0;padding:16px;font-family:sans-serif;}</style>
</head>
<body>${code}</body>
</html>`;
    }
    
    const blob = new Blob([html], { type: 'text/html' });
    return URL.createObjectURL(blob);
  }, [code, language, visible]);

  if (!code) return null;

  return (
    <Card className="mt-2 overflow-hidden border border-slate-200">
      <div className="flex items-center justify-between bg-slate-50 px-3 py-2 border-b border-slate-200">
        <span className="text-xs font-medium text-slate-500">🖥️ 代码预览</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setVisible(!visible)}>
            {visible ? '隐藏' : '预览'}
          </Button>
          <a href={blobUrl || '#'} target="_blank" rel="noopener noreferrer"
             className="text-xs text-blue-600 hover:underline flex items-center">
            新窗口打开
          </a>
        </div>
      </div>
      {visible && blobUrl && (
        <iframe
          src={blobUrl}
          className="w-full h-96 border-0"
          sandbox="allow-scripts allow-same-origin"
          title="code-preview"
        />
      )}
    </Card>
  );
}
```

> **注意**：这是一个 React Client Component（`'use client'`），因为使用了 `useState` 和 `URL.createObjectURL`。确保 Dashboard 的 `next.config.js` 允许 blob URL iframe。

#### 步骤 M1.2：在 Chat 页面中集成 CodePreview

找到 Dashboard 中渲染 Agent 消息代码块的组件，在代码块下方插入 `<CodePreview />`。

先找到 Chat 页面的消息渲染逻辑：

```bash
cat /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/app/chat/page.tsx
```

在渲染 `assistant` 消息时，检测消息内容是否包含代码块（```），如果包含，提取第一个代码块传递给 `CodePreview`。

在消息渲染组件中（通常是 `ChatContent.tsx` 或页面内部的 `MessageItem` 组件），添加：

```tsx
import CodePreview from '@/components/CodePreview';

// 在渲染 assistant 消息时
function extractCodeBlock(content: string): { code: string; lang: string } | null {
  const match = content.match(/```(\w+)?\n([\s\S]*?)```/);
  if (!match) return null;
  return { code: match[2].trim(), lang: match[1] || 'html' };
}

// 在 MessageItem 中
const codeBlock = msg.role === 'assistant' ? extractCodeBlock(msg.content) : null;

// 在消息渲染 JSX 中，代码块后面加上：
{codeBlock && <CodePreview code={codeBlock.code} language={codeBlock.lang} />}
```

#### 步骤 M1.3：验证

1. 启动 Dashboard：`pnpm dev`
2. 发送一个 Team 模式请求："写一个 React 登录按钮组件"
3. 在返回的消息中，应该能看到"🖥️ 代码预览"面板
4. 点击"预览"按钮，iframe 中应该渲染出按钮

---

## 四、模块 M2: 文件上传与多模态输入

### 4.1 设计决策

| 维度 | 方案 | 选择 |
|------|------|------|
| 存储位置 | 云存储 / 本地文件系统 | **本地文件系统**（`/uploads/` 目录） |
| 大小限制 | 5MB / 10MB | **10MB** |
| 支持格式 | 图片 / PDF / 代码文件 | **图片 + PDF + 代码文件**（`.png`, `.jpg`, `.pdf`, `.sql`, `.md`） |
| 数据库记录 | 独立表 / JSON 字段 | **messages.attachments JSON 字段**（轻量） |
| 接入模型 | 直接发送文件 URL / 转 base64 | **文件路径**（Gateway 读取文件后转 base64 发送给模型） |

### 4.2 执行步骤

#### 步骤 M2.1：数据库迁移 — 新增 `attachments` 支持

在 `packages/core/src/session/schema.ts` 的 `initSchema` 中，修改 `messages` 表：

```sql
-- 现有 messages 表修改（SQLite 不支持 ALTER TABLE ADD COLUMN 中的 CHECK，需要重新创建或用 ALTER 简单添加）
-- 简单方案：直接执行 ALTER TABLE（SQLite 支持有限的 ALTER）
ALTER TABLE messages ADD COLUMN attachments TEXT; -- JSON 数组 [{filename, path, type, size}]
```

如果 `initSchema` 是创建时执行的，需要处理**已有数据库的迁移**：

```typescript
// 在 initSchema 中，已有表检测后，尝试添加列（忽略错误）
export function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (...);
    CREATE TABLE IF NOT EXISTS messages (...);
    -- 尝试添加 attachments 列（如果已存在会报错，忽略）
  `);
  
  // 检查 messages 表是否有 attachments 列
  const hasAttachments = db.prepare(
    "SELECT COUNT(*) as count FROM pragma_table_info('messages') WHERE name = 'attachments'"
  ).get() as { count: number };
  
  if (hasAttachments.count === 0) {
    db.exec(`ALTER TABLE messages ADD COLUMN attachments TEXT;`);
  }
  
  // ... 其他表创建
}
```

#### 步骤 M2.2：创建 `uploads` 目录

```bash
mkdir -p /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/uploads
```

在 `.gitignore` 中排除 `uploads/`：

```bash
echo "uploads/" >> /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/.gitignore
```

#### 步骤 M2.3：Gateway 端点 — 文件上传

在 `packages/gateway/src/api-gateway.ts` 中，新增 `/upload` 端点：

```typescript
import multer from 'multer';
import { randomUUID } from 'crypto';
import path from 'path';

// 配置 multer
const uploadDir = path.resolve(process.cwd(), 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  }
});
const upload = multer({ 
  storage, 
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// 在 app 初始化后添加
app.post('/upload', upload.array('files', 5), (req, res) => {
  const files = (req.files as Express.Multer.File[]).map(f => ({
    filename: f.filename,
    originalname: f.originalname,
    path: f.path,
    size: f.size,
    mimetype: f.mimetype,
  }));
  res.json({ files });
});

// 提供文件访问（静态文件服务）
app.use('/uploads', express.static(uploadDir));
```

**需要安装 multer**：

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/gateway
pnpm add multer
pnpm add -D @types/multer
```

#### 步骤 M2.4：Dashboard 文件上传组件

文件：`packages/dashboard/src/components/FileUpload.tsx`

```tsx
'use client';

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';

interface FileUploadProps {
  onUpload: (files: Array<{ filename: string; originalname: string; url: string }>) => void;
}

export default function FileUpload({ onUpload }: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await fetch('/upload', { // 注意：/upload 是 Gateway 端点，不是 Dashboard API
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      onUpload(data.files.map((f: any) => ({
        filename: f.filename,
        originalname: f.originalname,
        url: `/uploads/${f.filename}`,
      })));
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.sql,.md,.txt"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? '上传中...' : '📎 附件'}
      </Button>
    </div>
  );
}
```

> **注意**：`/upload` 端点在 Gateway (`:8400`)，而 Dashboard 运行在 `:3000`。需要配置 Next.js 代理，或 Dashboard 直接请求 Gateway 地址。

在 `next.config.js` 中添加代理：

```javascript
// packages/dashboard/next.config.js
module.exports = {
  async rewrites() {
    return [
      {
        source: '/upload',
        destination: 'http://localhost:8400/upload',
      },
      {
        source: '/uploads/:path*',
        destination: 'http://localhost:8400/uploads/:path*',
      },
    ];
  },
};
```

#### 步骤 M2.5：在 Chat 页面集成文件上传

在 Chat 页面的输入区域，添加 `FileUpload` 组件。当文件上传完成后，将文件信息附加到下一条消息中。

消息发送时，如果存在附件，将 `attachments` JSON 作为额外字段发送。

Gateway 在转发到模型时，如果是图片，读取文件并转为 base64，使用 OpenAI 兼容的 `image_url` 格式发送。

```typescript
// 在 Gateway 处理 /v1/chat/completions 时
// 如果 messages 中包含 attachments，且 attachment 是图片，构建多模态消息
const processedMessages = messages.map(msg => {
  if (msg.attachments && Array.isArray(msg.attachments)) {
    const content: any[] = [{ type: 'text', text: msg.content }];
    for (const att of msg.attachments) {
      if (att.mimetype.startsWith('image/')) {
        const base64 = fs.readFileSync(att.path, 'base64');
        content.push({
          type: 'image_url',
          image_url: { url: `data:${att.mimetype};base64,${base64}` }
        });
      }
    }
    return { ...msg, content };
  }
  return msg;
});
```

---

## 五、模块 M3: Git 版本快照与集成

### 5.1 设计决策

| 维度 | 方案 | 选择 |
|------|------|------|
| 存储方式 | Git 仓库 / SQLite 快照 | **SQLite 快照 + 可选 GitHub 推送** |
| 快照粒度 | 每次会话 / 每次消息 / 手动 | **手动"保存快照" + 自动关键节点** |
| 版本模型 | Git 分支 / 线性快照 | **线性快照**（V1），Git 分支（V2） |
| 对外集成 | GitHub API / GitLab API | V1 预留字段，V2 实现 GitHub 推送 |

**核心原理**：
```
Team 模式完成 → 用户点击"保存快照" → 提取所有代码块 → 存入 snapshots 表
                                    → 可选：推送到 GitHub（V2）
```

### 5.2 执行步骤

#### 步骤 M3.1：数据库迁移 — 新增 `snapshots` 表

在 `packages/core/src/session/schema.ts` 中添加：

```sql
CREATE TABLE IF NOT EXISTS snapshots (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL,
  description TEXT,
  files       TEXT NOT NULL,                    -- JSON 数组 [{filename, content, language}]
  commit_message TEXT,                          -- Git 提交信息（预留）
  external_url TEXT,                            -- GitHub PR URL（预留）
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id, created_at);
```

同样处理**已有数据库迁移**（检查表是否存在，不存在则创建）。

#### 步骤 M3.2：Dashboard API — 快照 CRUD

文件：`packages/dashboard/src/app/api/snapshots/route.ts`

```typescript
import { NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const DB_PATH = process.env.SESSION_DB_PATH || '/Users/zhuizhui/.dev-agent/data/sessions.db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  
  const db = new Database(DB_PATH, { readonly: true });
  try {
    let query = 'SELECT * FROM snapshots';
    const params: any[] = [];
    if (sessionId) {
      query += ' WHERE session_id = ?';
      params.push(sessionId);
    }
    query += ' ORDER BY created_at DESC';
    const snapshots = db.prepare(query).all(...params);
    return NextResponse.json({ snapshots });
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
      INSERT INTO snapshots (id, session_id, user_id, title, description, files, commit_message)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      body.session_id,
      body.user_id || '',
      body.title || '未命名快照',
      body.description || '',
      JSON.stringify(body.files || []),
      body.commit_message || ''
    );
    return NextResponse.json({ id, ...body }, { status: 201 });
  } finally {
    db.close();
  }
}
```

#### 步骤 M3.3：Dashboard 快照组件

文件：`packages/dashboard/src/components/SnapshotPanel.tsx`

功能：
- 在 Chat 页面侧边栏或底部添加"快照"面板
- 显示当前会话的所有快照
- 点击"保存快照"按钮，提取当前会话中所有代码块，保存到 `snapshots` 表
- 快照列表显示标题、时间、文件数量

```tsx
'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface SnapshotPanelProps {
  sessionId: string;
  messages: Array<{ role: string; content: string }>;
}

export default function SnapshotPanel({ sessionId, messages }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/snapshots?session_id=${sessionId}`)
      .then(r => r.json())
      .then(d => setSnapshots(d.snapshots || []));
  }, [sessionId]);

  const handleSave = async () => {
    // 提取所有 assistant 消息中的代码块
    const files: Array<{ filename: string; content: string; language: string }> = [];
    let fileIndex = 0;
    
    for (const msg of messages) {
      if (msg.role === 'assistant') {
        const regex = /```(\w+)?\n([\s\S]*?)```/g;
        let match;
        while ((match = regex.exec(msg.content)) !== null) {
          files.push({
            filename: `file-${++fileIndex}.${match[1] || 'txt'}`,
            content: match[2].trim(),
            language: match[1] || 'txt',
          });
        }
      }
    }
    
    if (files.length === 0) {
      alert('当前会话中没有检测到代码块');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          title: `会话快照 ${new Date().toLocaleString()}`,
          description: `自动提取 ${files.length} 个代码文件`,
          files,
        }),
      });
      const data = await res.json();
      setSnapshots(prev => [data, ...prev]);
    } catch (e) {
      console.error('Save snapshot failed:', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">📦 代码快照</h3>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? '保存中...' : '保存快照'}
        </Button>
      </div>
      {snapshots.length === 0 ? (
        <p className="text-xs text-gray-400">暂无快照</p>
      ) : (
        <ul className="space-y-2">
          {snapshots.map(s => (
            <li key={s.id} className="text-xs border-b border-slate-100 pb-2">
              <div className="font-medium">{s.title}</div>
              <div className="text-gray-400">
                {JSON.parse(s.files || '[]').length} 文件 · {new Date(s.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
```

#### 步骤 M3.4：V2 预留 — GitHub 集成字段

`snapshots` 表中已预留 `external_url` 字段。V2 阶段实现：
- 在 Dashboard Settings 中配置 GitHub Personal Access Token
- 快照保存时，可选"推送到 GitHub"
- 使用 GitHub API 创建 commit / PR

---

## 六、模块 M4: 用户系统（Clerk）

### 6.1 设计决策

| 维度 | 方案 | 选择 |
|------|------|------|
| 认证框架 | Clerk / Auth0 / NextAuth | **Clerk**（最轻量、Next.js 原生支持） |
| 用户数据 | 只存 Clerk ID / 自建 users 表 | **只存 Clerk ID**（不存密码、邮箱） |
| 权限模型 | 角色 / 项目成员 | V1 只区分"登录/未登录"，V2 做项目权限 |
| 路由保护 | 全站需登录 / 部分开放 | **Chat/Workflows 需登录，首页开放** |

### 6.2 执行步骤

#### 步骤 M4.1：Clerk 注册与配置

1. 访问 https://clerk.com
2. 注册账号，创建 Application
3. 获取 **Publishable Key** 和 **Secret Key**
4. 在 Dashboard 的 `.env.local` 中添加：

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/chat
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/chat
```

#### 步骤 M4.2：安装 Clerk SDK

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard
pnpm add @clerk/nextjs
```

#### 步骤 M4.3：配置 Clerk Provider

修改 `packages/dashboard/src/app/layout.tsx`：

```tsx
import { ClerkProvider } from '@clerk/nextjs';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          {/* ... 现有内容 ... */}
        </body>
      </html>
    </ClerkProvider>
  );
}
```

> **注意**：ClerkProvider 需要包裹整个应用。确保现有 `ToastProvider` 等组件仍在内部。

#### 步骤 M4.4：创建登录/注册页面

```bash
mkdir -p /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/app/sign-in/\[\[...sign-in\]\]
mkdir -p /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard/src/app/sign-up/\[\[...sign-up\]\]
```

文件：`packages/dashboard/src/app/sign-in/[[...sign-in]]/page.tsx`

```tsx
import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn />
    </div>
  );
}
```

文件：`packages/dashboard/src/app/sign-up/[[...sign-up]]/page.tsx`

```tsx
import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp />
    </div>
  );
}
```

#### 步骤 M4.5：路由保护

创建 `packages/dashboard/src/middleware.ts`：

```typescript
import { authMiddleware } from '@clerk/nextjs';

export default authMiddleware({
  publicRoutes: ['/', '/api/health'], // 首页和健康检查无需登录
});

export const config = {
  matcher: ['/((?!.*\\..*|_next).*)', '/', '/(api|trpc)(.*)'],
};
```

#### 步骤 M4.6：在 NavBar 显示用户信息

修改 `packages/dashboard/src/components/NavBar.tsx`，添加 Clerk 的用户按钮：

```tsx
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

// 在 NavBar 右侧添加
<div className="flex items-center gap-4">
  <SignedIn>
    <UserButton afterSignOutUrl="/" />
  </SignedIn>
  <SignedOut>
    <SignInButton mode="modal">
      <button className="text-sm text-blue-600 hover:underline">登录</button>
    </SignInButton>
  </SignedOut>
</div>
```

#### 步骤 M4.7：关联会话到用户

在数据库 `sessions` 表中添加 `user_id` 字段：

```sql
-- 迁移
ALTER TABLE sessions ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at);
```

在创建会话时，从 Clerk 获取当前用户 ID，写入 `user_id`。

在 Dashboard API 中，所有查询添加 `user_id` 过滤（Clerk 的 `auth()` 函数获取当前用户）：

```typescript
import { auth } from '@clerk/nextjs';

export async function GET() {
  const { userId } = auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const db = new Database(DB_PATH, { readonly: true });
  const sessions = db.prepare('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC').all(userId);
  // ...
}
```

---

## 七、数据库迁移总览

所有迁移需要一次性执行，确保现有数据库平滑升级：

```bash
#!/usr/bin/env bash
# migrate.sh — 数据库迁移脚本

DB="$HOME/.dev-agent/data/sessions.db"

echo "🔄 数据库迁移: $DB"

sqlite3 "$DB" <<'EOF'
-- 1. messages 表添加 attachments 列
ALTER TABLE messages ADD COLUMN attachments TEXT;

-- 2. sessions 表添加 user_id 列
ALTER TABLE sessions ADD COLUMN user_id TEXT;
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id, created_at);

-- 3. 新增 snapshots 表
CREATE TABLE IF NOT EXISTS snapshots (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL DEFAULT '',
  title       TEXT NOT NULL,
  description TEXT,
  files       TEXT NOT NULL,
  commit_message TEXT,
  external_url TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_snapshots_session ON snapshots(session_id, created_at);

-- 4. 新增 users 表（预留，如果未来不用 Clerk 时可迁移）
CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  clerk_id    TEXT UNIQUE,
  email       TEXT,
  name        TEXT,
  avatar      TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

SELECT '迁移完成' as status;
EOF
```

**执行方式**：

```bash
bash /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/scripts/migrate.sh
```

---

## 八、Dashboard 页面变更总览

| 页面 | 变更 | 说明 |
|------|------|------|
| `layout.tsx` | 添加 ClerkProvider | 包裹整个应用 |
| `chat/page.tsx` | 添加 FileUpload、CodePreview、SnapshotPanel | 多模态 + 预览 + 快照 |
| `sign-in/[[...sign-in]]/page.tsx` | 新建 | Clerk 登录页 |
| `sign-up/[[...sign-up]]/page.tsx` | 新建 | Clerk 注册页 |
| `NavBar.tsx` | 添加 UserButton / SignInButton | 用户状态显示 |
| `middleware.ts` | 新建 | 路由保护 |

---

## 九、API 路由变更总览

| 路由 | 类型 | 说明 |
|------|------|------|
| `POST /upload` | Gateway | 文件上传（multer） |
| `GET /uploads/:path` | Gateway | 静态文件访问 |
| `GET /api/snapshots` | Dashboard | 快照列表 |
| `POST /api/snapshots` | Dashboard | 创建快照 |
| `GET /api/snapshots?session_id=xxx` | Dashboard | 按会话筛选 |

---

## 十、依赖安装清单

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard
pnpm add @clerk/nextjs

cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/gateway
pnpm add multer
pnpm add -D @types/multer
```

---

## 十一、验收方案

### 验收清单

| 编号 | 验收项 | 检查方式 | 通过标准 |
|------|--------|----------|----------|
| M1-1 | 代码预览组件渲染 | 发送"写 React 按钮"，查看 Chat 页面 | 消息下方有"🖥️ 代码预览"面板 |
| M1-2 | 点击预览显示 iframe | 点击"预览"按钮 | iframe 内渲染出按钮 |
| M1-3 | 新窗口打开 | 点击"新窗口打开" | 新标签页显示正确结果 |
| M2-1 | 文件上传成功 | 点击"📎 附件"选择图片 | 上传成功，返回文件 URL |
| M2-2 | 附件消息发送 | 发送带附件的消息 | 消息包含 attachments 字段 |
| M2-3 | 数据库有 attachments | 查询 messages 表 | attachments 列有 JSON 值 |
| M3-1 | 快照保存成功 | 在 Chat 页面点击"保存快照" | 数据库 snapshots 表有记录 |
| M3-2 | 快照列表显示 | 查看快照面板 | 显示已保存的快照列表 |
| M3-3 | 快照包含代码文件 | 查询 snapshots.files | 包含提取的代码块 |
| M4-1 | Clerk 登录页可访问 | 访问 `/sign-in` | 显示 Clerk 登录界面 |
| M4-2 | 登录成功跳转 | 登录后 | 跳转到 `/chat` |
| M4-3 | NavBar 显示头像 | 登录后查看 Dashboard | 右上角显示用户头像 |
| M4-4 | 会话关联用户 | 创建新会话 | sessions.user_id 有值 |
| M4-5 | 未登录访问保护 | 访问 `/chat` 未登录 | 重定向到 `/sign-in` |
| M4-6 | 数据库有 users 表 | 查询 `.tables` | 包含 `users` 表 |
| REG-1 | 回归测试通过 | `bash scripts/quick-regression.sh` | 6/6 通过 |

---

## 十二、执行顺序（给 CC）

**按以下顺序执行，不可跳过**：

1. **前置检查** — 停止所有服务，备份数据库
2. **M4.1-4.2** — 安装 Clerk SDK（dashboard）和 multer（gateway）
3. **M4.3-4.6** — 用户系统（Clerk Provider、登录页、路由保护、NavBar）
4. **M2.1-2.2** — 数据库迁移（attachments + user_id + snapshots + users）
5. **M2.3-2.4** — 文件上传（Gateway upload 端点、multer、next.config proxy）
6. **M2.5** — Dashboard 文件上传组件 + Chat 集成
7. **M1.1-1.2** — 代码预览组件 + Chat 集成
8. **M3.1-3.3** — 快照表 + API + SnapshotPanel + Chat 集成
9. **M3.4** — V2 预留字段（GitHub 相关）
10. **启动验证** — 启动所有服务，逐项验收

---

## 十三、风险与回退

### 风险 1：Clerk 注册流程阻塞

**现象**：Clerk 需要邮箱验证，可能卡在国外短信。  
**回退**：先用 `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=dummy` 跳过，或改用 NextAuth（GitHub OAuth 登录）。

### 风险 2：multer 与 Next.js 冲突

**现象**：Next.js App Router 对 multer 支持不好。  
**回退**：文件上传端点放在 Gateway（Express）而不是 Dashboard（Next.js），已按此设计。

### 风险 3：CodePreview iframe CSP 报错

**现象**：iframe 内加载 React CDN 被 CSP 阻止。  
**回退**：`sandbox="allow-scripts allow-same-origin"` 已设置。如果仍报错，在 `next.config.js` 中添加 `headers` 配置放宽 CSP。

### 风险 4：数据库迁移失败（列已存在）

**现象**：重复执行迁移脚本，`ALTER TABLE ADD COLUMN` 报错。  
**回退**：迁移脚本使用 `IF NOT EXISTS` 或先检查列是否存在（已在 `initSchema` 中处理）。

---

**版本**：v1.0  
**设计**：Kimi（架构师）  
**执行**：Claude Code（CC）  
**日期**：2026-06-18
