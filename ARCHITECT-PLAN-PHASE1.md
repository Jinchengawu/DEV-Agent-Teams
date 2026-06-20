# 架构师计划书 — 阶段1：框架净化与血缘建立

> **角色分工**：本计划由 Kimi（架构师）设计，Claude Code（CC）执行代码实现。  
> **目标受众**：CC（执行者），不需要理解全局架构，只需按步骤执行。  
> **执行环境**：两个仓库位于同一目录：
> - 框架仓库：`/Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams`
> - 实例仓库：`/Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams`

---

## 一、问题陈述（为什么做这件事）

当前两个仓库存在**命名冲突**和**血缘断裂**：

| 仓库 | 包名 | 问题 |
|------|------|------|
| Open-Agent-Teams | `@dev-agent/core` | 应该叫 `@open-agent-teams/core`（框架名） |
| DEV-Agent-Teams | `@dev-agent/core` | 同名冲突！两个仓库的 core 包名一样 |
| 关系 | 无 | DEV 直接依赖 `@open-multi-agent/core`（第三方），不依赖自己的框架 |

**目标**：让 DEV-Agent-Teams 明确依赖 `@open-agent-teams/core`，建立"框架→实例"血缘关系。

---

## 二、架构设计（怎么做）

```
阶段1 后预期状态：

Open-Agent-Teams/                          DEV-Agent-Teams/
├── packages/core/                          ├── packages/core/
│   ├── package.json                        │   ├── package.json
│   │   name: "@open-agent-teams/core"      │   │   name: "@dev-agent/core"
│   │   main: "dist/index.js"               │   │   dependencies:
│   │   types: "dist/index.d.ts"            │   │     "@open-agent-teams/core": "link:../..."
│   ├── tsconfig.json (已有)                │   ├── src/index.ts
│   │   outDir: "dist"                      │   │   export * from '@open-agent-teams/core'
│   │   declaration: true                   │   │   (现有 DEV 特有导出保留)
│   ├── src/index.ts                        │   ├── (DEV 特有代码保留)
│   └── dist/ ← 构建产物                   │   └── (通过 link 访问框架)
│       index.js + index.d.ts              │
```

**关键决策**：
- DEV 的 `packages/core` 不删除任何现有代码，只在 `index.ts` 中**追加**框架导出
- 这意味着 DEV 的 core 是"框架 + DEV 扩展"的叠加态
- 后续阶段再逐步把通用代码迁移到框架，DEV core 逐步瘦身

---

## 三、给 CC 的执行计划书（精确到文件和命令）

### 前置检查（执行前必做）

```bash
# 1. 确认两个仓库存在
ls /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams/packages/core/package.json
ls /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/core/package.json

# 2. 确认 pnpm 可用
pnpm -v

# 3. 确认当前无 Gateway 冲突（如果正在运行，先停止）
# 在 DEV 仓库中执行：
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams
./dev-agent stop 2>/dev/null || true
```

---

### 仓库 A：Open-Agent-Teams（框架改名 + 构建）

**工作目录**：`cd /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams`

#### 步骤 A1：修改 `packages/core/package.json`

文件：`packages/core/package.json`

修改内容：
```json
{
  "name": "@open-agent-teams/core",
  "version": "0.1.0",
  "description": "Open-Agent-Teams shared core — 多 Agent 编排框架",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "scripts": {
    "build": "tsc",
    "check": "tsc --noEmit"
  }
  // ... dependencies 和 devDependencies 保持不变
}
```

> **注意**：只改 `name`、`description`、`main`、`types`、`exports`，**不改 dependencies**。

#### 步骤 A2：搜索并替换仓库内所有 `@dev-agent/core` 引用

```bash
# 1. 搜索所有引用（先确认范围）
cd /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams
grep -r "@dev-agent/core" packages/ --include="package.json" --include="*.ts" -l

# 2. 替换（用 sed 或 Edit 工具）
# 所有 packages/*/package.json 中引用 @dev-agent/core 的，改为 @open-agent-teams/core
# 所有 .ts 文件中 import from '@dev-agent/core' 的，改为 import from '@open-agent-teams/core'
```

**预期修改文件**：
- `packages/gateway/package.json`（如果引用了）
- `packages/glue-service/package.json`（如果引用了）
- `packages/dashboard/package.json`（如果引用了）
- 任何 `.ts` 文件中的 import 语句

#### 步骤 A3：构建 `packages/core`

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams/packages/core

# 1. 安装依赖（如果还没有）
pnpm install

# 2. 构建
pnpm build

# 3. 验证 dist/ 存在
ls dist/index.js dist/index.d.ts
```

**预期输出**：
- `dist/index.js` 存在（ESM 模块）
- `dist/index.d.ts` 存在（类型声明）
- `dist/*.js` 和 `dist/*.d.ts` 文件覆盖所有 `src/` 子目录

**如果构建失败**：
- 检查 `tsconfig.json` 的 `outDir` 是否被 `noEmit` 覆盖（如果 `scripts.build` 直接调 `tsc`，而 `tsconfig.json` 没有 `noEmit: true`，那应该没问题）
- 如果 `tsconfig.json` 有 `noEmit: true`，需要先移除或覆盖

#### 步骤 A4：验证构建产物

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams/packages/core
node -e "import('./dist/index.js').then(m => console.log('exports:', Object.keys(m).slice(0,5)))"
```

预期输出类似：`exports: [ 'SessionManager', 'MemoryStore', 'AgentBus', ... ]`

#### 步骤 A5：Git 提交（可选，建议做）

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams
git add -A
git commit -m "refactor: rename @dev-agent/core to @open-agent-teams/core, add dist build output"
```

---

### 仓库 B：DEV-Agent-Teams（建立血缘关系）

**工作目录**：`cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams`

#### 步骤 B1：修改 `packages/core/package.json`（添加框架依赖）

文件：`packages/core/package.json`

修改内容（只添加 `dependencies` 中的一项）：
```json
{
  "name": "@dev-agent/core",
  "version": "0.3.0",
  "description": "DEV-Agent-Teams core — 基于 @open-agent-teams/core 的开发团队实例",
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "build": "tsc",
    "check": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@open-agent-teams/core": "link:../Open-Agent-Teams/packages/core",
    "@open-multi-agent/core": "^1.4.2",
    "better-sqlite3": "^11.0.0",
    "express": "^4.18.0",
    "uuid": "^9.0.0",
    "zod": "^3.23.0"
  }
  // ... devDependencies 保持不变
}
```

> **关键**：`link:../Open-Agent-Teams/packages/core` 会创建符号链接到框架仓库的 core 目录。pnpm 在解析时，会先使用 `link:` 协议，而不是去 npm registry 查找。

#### 步骤 B2：修改 `packages/core/src/index.ts`（重新导出框架）

文件：`packages/core/src/index.ts`

在文件**末尾**追加一行：
```typescript
// 重新导出 Open-Agent-Teams 框架核心（血缘关系）
export * from '@open-agent-teams/core';
```

**修改后的文件结构**：
```typescript
// @dev-agent/core — 基于 @open-multi-agent/core 的多 Agent 协作框架

// ── 会话管理（保留，框架不覆盖）──
export { SessionManager } from './session/SessionManager';
export { initSchema } from './session/schema';
// ... (所有现有导出保持不变)

// ── 重新导出 Open-Agent-Teams 框架核心 ──
export * from '@open-agent-teams/core';
```

> **注意**：不要删除任何现有导出。追加的 `export *` 会让 DEV 的 core 既包含自己的代码，又包含框架代码。

#### 步骤 B3：在 DEV 仓库中安装依赖

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams

# 1. 安装（pnpm 会自动处理 link: 协议）
pnpm install

# 2. 验证链接是否正确创建
ls -la node_modules/@open-agent-teams/core
```

**预期输出**：
```
lrwxr-xr-x ... node_modules/@open-agent-teams/core -> ../Open-Agent-Teams/packages/core
```

如果不是符号链接，检查 `pnpm install` 的输出是否有错误。

#### 步骤 B4：类型检查（验证编译通过）

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/core
pnpm check
```

预期：没有 TypeScript 错误。

如果报错（如模块解析问题），检查 `tsconfig.json` 的 `moduleResolution` 是否支持 `link:` 解析。

#### 步骤 B5：启动 Gateway 验证

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/gateway
pnpm dev
```

在另一个终端验证：
```bash
curl -s http://localhost:8400/health | python3 -m json.tool
```

预期返回：
```json
{
  "status": "ok",
  "gateway": "dev-agent-teams",
  "agents": 5
}
```

#### 步骤 B6：启动所有 Agent 验证

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams
./dev-agent start
```

或手动启动各个 Agent（如果 dev-agent 脚本不可用）：
```bash
# 在另一个终端中分别启动（或查看 dev-agent 脚本内容）
```

#### 步骤 B7：运行回归测试

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams
bash scripts/quick-regression.sh
```

预期输出：5 个测试全部通过（✅）。

#### 步骤 B8：Git 提交（可选，建议做）

```bash
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams
git add -A
git commit -m "feat: establish lineage with @open-agent-teams/core via link dependency"
```

---

## 四、验收方案（怎么算成功）

### 验收清单

| 编号 | 验收项 | 检查命令 | 通过标准 |
|------|--------|----------|----------|
| TC-01 | Open 包名正确 | `cat Open/packages/core/package.json \| grep '"name"'` | 输出 `"@open-agent-teams/core"` |
| TC-02 | Open 构建产物存在 | `ls Open/packages/core/dist/index.js` | 文件存在 |
| TC-03 | Open 类型声明存在 | `ls Open/packages/core/dist/index.d.ts` | 文件存在 |
| TC-04 | DEV 依赖声明正确 | `cat DEV/packages/core/package.json \| grep '"@open-agent-teams/core"'` | 输出包含 `link:../Open-Agent-Teams/packages/core` |
| TC-05 | 符号链接正确 | `ls -la DEV/node_modules/@open-agent-teams/core` | 是符号链接，指向 `../Open-Agent-Teams/packages/core` |
| TC-06 | DEV 类型检查通过 | `cd DEV/packages/core && pnpm check` | 返回 exit code 0，无错误 |
| TC-07 | Gateway 健康 | `curl http://localhost:8400/health` | 返回 `status: "ok"`，`agents: 5` |
| TC-08 | 5 Agent 在线 | `curl http://localhost:820{1,2,3,4,5}/` | 全部返回 200 |
| TC-09 | 快速回归测试 | `cd DEV && bash scripts/quick-regression.sh` | 5/5 通过 |
| TC-10 | 功能无退化 | 发送一个 Team 模式请求 | 返回内容正常，ContentLength > 200 |

### 验收执行脚本（一键验证）

```bash
#!/usr/bin/env bash
# phase1-acceptance.sh — 阶段1验收脚本

set -e

OPEN="/Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams"
DEV="/Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  local expected="$3"
  local result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -q "$expected"; then
    echo "  ✅ $desc"
    ((PASS++))
  else
    echo "  ❌ $desc"
    echo "     期望: $expected"
    echo "     实际: $result"
    ((FAIL++))
  fi
}

echo "🧪 阶段1 验收测试"
echo "================"

check "TC-01 Open 包名" "cat $OPEN/packages/core/package.json | grep 'name'" "@open-agent-teams/core"
check "TC-02 构建产物" "ls $OPEN/packages/core/dist/index.js 2>&1 && echo 'found'" "found"
check "TC-03 类型声明" "ls $OPEN/packages/core/dist/index.d.ts 2>&1 && echo 'found'" "found"
check "TC-04 DEV 依赖" "cat $DEV/packages/core/package.json | grep '@open-agent-teams/core'" "link"
check "TC-05 符号链接" "ls -la $DEV/node_modules/@open-agent-teams/core 2>&1" "->"

echo ""
echo "📊 结果: $PASS 通过, $FAIL 失败"
[ "$FAIL" -eq 0 ] && echo "🏁 验收通过" || echo "❌ 验收未通过"
```

---

## 五、风险与回退方案

### 风险1：构建失败（Open-Agent-Teams core）

**现象**：`pnpm build` 报错，TypeScript 编译失败。  
**原因**：`tsconfig.json` 可能有 `noEmit: true` 或 `outDir` 配置冲突。  
**排查**：
```bash
cd Open-Agent-Teams/packages/core
cat tsconfig.json | grep -E "noEmit|outDir"
# 如果 noEmit 为 true，需要临时改为 false 或创建 tsconfig.build.json
```
**回退**：如果构建失败，保持 `main: "src/index.ts"`，先建立 `link:` 依赖，后续再解决构建问题。

### 风险2：pnpm 不解析 `link:` 协议

**现象**：`pnpm install` 后 `node_modules/@open-agent-teams/core` 不是符号链接。  
**排查**：
```bash
cd DEV-Agent-Teams
pnpm install --frozen-lockfile=false
# 如果仍然不行，手动创建符号链接：
ln -s ../Open-Agent-Teams/packages/core node_modules/@open-agent-teams/core
```
**回退**：如果 `link:` 不可用，使用 `file:` 协议（`"file:../Open-Agent-Teams/packages/core"`），但这会复制文件而不是链接。

### 风险3：类型冲突（DEV core 和框架 core 有同名导出）

**现象**：`pnpm check` 报错，同名类型冲突。  
**原因**：DEV 的 `index.ts` 和框架的 `index.ts` 都导出了同名的类型（如 `TeamOrchestrator`）。  
**解决**：如果 `export *` 导致冲突，改为具名导出：
```typescript
// 不使用 export *，改为别名导出
export { TeamOrchestrator as FrameworkTeamOrchestrator } from '@open-agent-teams/core';
```
**回退**：如果冲突严重，阶段1 不添加 `export *`，只添加 `import` 语句验证依赖关系能解析即可。

### 风险4：Gateway 启动失败

**现象**：Gateway 启动报错，找不到模块。  
**原因**：`link:` 依赖在运行时解析失败。  
**排查**：
```bash
cd DEV-Agent-Teams/packages/gateway
# 检查 node_modules 中的 @open-agent-teams/core 是否可解析
node -e "require.resolve('@open-agent-teams/core')" 2>&1
```
**回退**：如果运行时失败，在 `packages/gateway/package.json` 中也添加 `"@open-agent-teams/core": "link:../Open-Agent-Teams/packages/core"`，确保 gateway 能解析。

---

## 六、后续阶段预告（只做了解，不执行）

| 阶段 | 目标 | 范围 |
|------|------|------|
| **阶段2** | 代码迁移 | 把 DEV core 中通用代码（SessionManager、AgentFactory）迁移到框架，DEV core 只保留 DEV 特有代码 |
| **阶段3** | 框架发布 | 将 `@open-agent-teams/core` 发布到 npm（或 private registry），DEV 改为版本号依赖 |
| **阶段4** | 多团队生成 | 实现 `dev-architect` Agent，能生成新团队（如 `Quant-Agent-Teams`） |
| **阶段5** | Dashboard 升级 | 支持多团队管理，一个 Dashboard 管理所有 Agent Teams |

> **当前只做阶段1**。阶段2+ 等阶段1验收通过后再设计。

---

## 七、执行检查清单（CC 每完成一步打勾）

- [x] 前置检查完成（仓库存在、pnpm 可用、Gateway 已停止）
- [x] **仓库 A 步骤 A1**：`packages/core/package.json` 已改名
- [x] **仓库 A 步骤 A2**：所有 `@dev-agent/core` 引用已替换
- [x] **仓库 A 步骤 A3**：`pnpm build` 成功，`dist/` 存在
- [x] **仓库 A 步骤 A4**：构建产物验证通过
- [x] **仓库 A 步骤 A5**：Git 提交完成
- [x] **仓库 B 步骤 B1**：`packages/core/package.json` 已添加 `link:` 依赖
- [x] **仓库 B 步骤 B2**：`packages/core/src/index.ts` 已追加 `export *`
- [x] **仓库 B 步骤 B3**：`pnpm install` 成功，符号链接正确
- [x] **仓库 B 步骤 B4**：`pnpm check` 无错误
- [x] **仓库 B 步骤 B5**：Gateway 启动成功，`/health` 返回 200
- [x] **仓库 B 步骤 B6**：5 个 Agent 全部在线
- [x] **仓库 B 步骤 B7**：`quick-regression.sh` 5/5 通过
- [x] **仓库 B 步骤 B8**：Git 提交完成
- [x] 验收脚本 `phase1-acceptance.sh` 8/8 通过

---

**版本**：v1.0  
**设计**：Kimi（架构师）  
**执行**：Claude Code（CC）  
**日期**：2026-06-17（计划）/ 2026-06-18（执行完成）
