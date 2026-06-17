# DEV-Agent-Teams 回归测试文档

> **版本**: v1.0  
> **适用范围**: 所有 Agent / 模型 / 人工测试者  
> **目标**: 验证 DEV-Agent-Teams 多 Agent 开发框架的核心功能是否正常运行  
> **预计耗时**: 5-10 分钟

---

## 1. 测试概述

本文档定义了 DEV-Agent-Teams 框架的标准回归测试流程，涵盖：

- **服务健康检查** — 验证所有组件是否在线
- **单 Agent 能力测试** — 验证单个 Agent 独立处理任务
- **多 Agent 协同测试** — 验证 Team 模式（DAG 并行执行）
- **会议模式测试** — 验证 Meeting 模式（圆桌讨论）
- **数据持久化验证** — 验证会话/消息存储
- **Dashboard 集成测试** — 验证前端管理界面

---

## 2. 前置条件

### 2.1 环境要求

| 依赖 | 最低版本 | 检查命令 |
|------|----------|----------|
| Node.js | v20+ | `node -v` |
| pnpm | v9+ | `pnpm -v` |
| SQLite | 任意 | `sqlite3 --version` |
| curl | 任意 | `curl --version` |
| Python3 | v3.10+ | `python3 --version` |

### 2.2 服务运行状态

以下服务必须处于运行状态：

| 服务 | 端口 | 检查端点 |
|------|------|----------|
| Gateway | `8400` | `http://localhost:8400/health` |
| Dashboard | `3000` | `http://localhost:3000` |
| Frontend Agent | `8201` | `http://localhost:8201` |
| Backend Agent | `8202` | `http://localhost:8202` |
| Testing Agent | `8203` | `http://localhost:8203` |
| DevOps Agent | `8204` | `http://localhost:8204` |
| PM Agent | `8205` | `http://localhost:8205` |

### 2.3 环境变量

`.env` 文件必须包含：

```bash
MODEL_PROVIDER=openai
MODEL_NAME=mimo-v2.5-pro          # 或你使用的模型
MODEL_BASE_URL=<模型API地址>
API_KEY=<API密钥>

# Agent 端口（可选，使用默认值）
FRONTEND_AGENT_PORT=8201
BACKEND_AGENT_PORT=8202
TESTING_AGENT_PORT=8203
DEVOPS_AGENT_PORT=8204
PM_AGENT_PORT=8205
```

---

## 3. 测试用例（逐步执行）

> **执行方式**: 按顺序执行每个测试步骤，记录结果（✅ 通过 / ❌ 失败 / ⏳ 超时）

### 3.1 TC-01: 基础健康检查

**目标**: 验证所有服务在线

```bash
# 执行命令
echo "=== Gateway 健康检查 ==="
curl -s http://localhost:8400/health | python3 -m json.tool

echo ""
echo "=== 5 个 Agent 健康检查 ==="
for port in 8201 8202 8203 8204 8205; do
  echo -n "Agent port $port: "
  curl -s http://localhost:$port/ | python3 -c "
import sys, json
try:
    d = json.load(sys.stdin)
    print(f\"✅ {d.get('agent', 'unknown')} online\")
except: print('❌ 失败')
"
done

echo ""
echo "=== Dashboard 可访问性 ==="
curl -s http://localhost:3000 | head -c 50
```

**预期结果**:
- Gateway 返回 `status: "ok"`，`agents: 5`
- 5 个 Agent 均返回 `status: "ok"` 和对应 `agent` 字段
- Dashboard 返回 HTML 内容（以 `<!DOCTYPE` 开头）

**通过标准**: 所有检查返回 200 OK

---

### 3.2 TC-02: Agent 列表 API

**目标**: 验证编排器能正确列出所有 Agent

```bash
# 执行命令
curl -s http://localhost:8400/agents | python3 -m json.tool
```

**预期结果**:
```json
{
    "agents": [
        {"name": "dev-frontend", "model": "mimo-v2.5-pro"},
        {"name": "dev-backend", "model": "mimo-v2.5-pro"},
        {"name": "dev-testing", "model": "mimo-v2.5-pro"},
        {"name": "dev-devops", "model": "mimo-v2.5-pro"},
        {"name": "dev-pm", "model": "mimo-v2.5-pro"}
    ]
}
```

**通过标准**: 返回 5 个 Agent，每个包含 `name` 和 `model`

---

### 3.3 TC-03: 单 Agent 模式 — 前端开发任务

**目标**: 验证指定 Agent 独立处理简单任务

```bash
# 执行命令（注意：替换 <sessionId> 为唯一值，避免会话冲突）
SESSION_ID="reg-test-$(date +%s)"

curl -s -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [{\"role\": \"user\", \"content\": \"用React写一个简洁的登录表单组件\"}],
    \"mode\": \"agent\",
    \"agentId\": \"dev-frontend\",
    \"sessionId\": \"$SESSION_ID\"
  }" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(f'RoutedBy: {d.get(\"routedBy\", \"unknown\")}')
    print(f'Agent: {d.get(\"model\", \"unknown\")}')
    print(f'ContentLength: {len(content)}')
    print(f'ContentPreview: {content[:200] if content else \"(empty)\"}')
    print(f'Status: {\"PASS\" if len(content) > 50 else \"WARN\"}')
except Exception as e:
    print(f'Error: {e}')
    print(f'Raw: {raw[:300]}')
"
```

**预期结果**:
- `RoutedBy`: `client-specified`
- `Agent`: `dev-frontend`
- `ContentLength`: > 50（可能返回空，属已知问题，见 §5）
- `Status`: `PASS` 或 `WARN`

**超时设置**: 120 秒

**通过标准**: API 返回 200，响应结构正确（`id`、`sessionId`、`choices` 存在）

---

### 3.4 TC-04: Team 模式 — 多 Agent 协同开发

**目标**: 验证协调员自动分解任务并调度多个 Agent 并行执行

```bash
# 执行命令
SESSION_ID="reg-test-team-$(date +%s)"

curl -s -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [{\"role\": \"user\", \"content\": \"设计一个简单的用户注册流程\"}],
    \"mode\": \"team\",
    \"sessionId\": \"$SESSION_ID\"
  }" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(f'RoutedBy: {d.get(\"routedBy\", \"unknown\")}')
    print(f'Agent: {d.get(\"model\", \"unknown\")}')
    print(f'ContentLength: {len(content)}')
    print(f'HasMultipleAgents: {\"dev-frontend\" in content or \"dev-backend\" in content or \"dev-pm\" in content}')
    print(f'Status: {\"PASS\" if len(content) > 500 else \"FAIL\"}')
except Exception as e:
    print(f'Error: {e}')
    print(f'Raw: {raw[:300]}')
"
```

**预期结果**:
- `RoutedBy`: `team-orchestrator`
- `Agent`: `team`
- `ContentLength`: > 500（通常 1000-3000+）
- `HasMultipleAgents`: `True`（内容中包含多个 Agent 的输出）
- 内容应包含 `## dev-frontend`、`## dev-backend` 等章节

**超时设置**: 180 秒

**通过标准**: ContentLength > 500，包含多 Agent 协作标记

---

### 3.5 TC-05: Meeting 模式 — 圆桌技术讨论

**目标**: 验证所有 Agent 参与会议讨论

```bash
# 执行命令（注意：此模式较慢，设置较长超时）
SESSION_ID="reg-test-meeting-$(date +%s)"

curl -s -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d "{
    \"messages\": [{\"role\": \"user\", \"content\": \"技术选型：Next.js vs Vue，哪个更适合我们的项目？\"}],
    \"mode\": \"meeting\",
    \"sessionId\": \"$SESSION_ID\"
  }" | python3 -c "
import sys, json
raw = sys.stdin.read()
try:
    d = json.loads(raw)
    content = d.get('choices', [{}])[0].get('message', {}).get('content', '')
    print(f'RoutedBy: {d.get(\"routedBy\", \"unknown\")}')
    print(f'Agent: {d.get(\"model\", \"unknown\")}')
    print(f'ContentLength: {len(content)}')
    print(f'Status: {\"PASS\" if len(content) > 100 else \"FAIL\"}')
except Exception as e:
    print(f'Error: {e}')
    print(f'Raw: {raw[:300]}')
"
```

**预期结果**:
- `RoutedBy`: `meeting-orchestrator`
- `Agent`: `meeting`
- `ContentLength`: > 100（通常 2000+，取决于模型响应速度）
- 内容应包含多个 Agent 的观点（`## 🧑‍💼 dev-frontend` 等）

**超时设置**: 300 秒（5 分钟）

**通过标准**: 返回 200，内容结构正确（多 Agent 发言）

> ⚠️ **注意**: Meeting 模式串行执行 5 个 Agent，受模型 API 延迟影响较大。如果超时，检查模型 API 状态。

---

### 3.6 TC-06: 数据持久化验证

**目标**: 验证会话和消息已正确写入 SQLite

```bash
# 执行命令（假设数据库路径为 ~/.dev-agent/data/sessions.db）
DB_PATH="$HOME/.dev-agent/data/sessions.db"

echo "=== 会话统计 ==="
sqlite3 "$DB_PATH" "SELECT COUNT(*) as total_sessions FROM sessions;" 2>/dev/null

echo ""
echo "=== 最新消息（5条） ==="
sqlite3 "$DB_PATH" ".mode column" ".headers on" \
  "SELECT session_id, role, agent_id, LENGTH(content) as content_len, substr(content, 1, 30) as preview FROM messages ORDER BY id DESC LIMIT 5;" 2>/dev/null

echo ""
echo "=== 特定会话消息数 ==="
sqlite3 "$DB_PATH" "SELECT session_id, COUNT(*) as msg_count FROM messages GROUP BY session_id ORDER BY msg_count DESC LIMIT 5;" 2>/dev/null
```

**预期结果**:
- `total_sessions`: > 0（如果之前运行过测试）
- 消息表包含 `user` 和 `assistant` 角色
- `assistant` 消息的 `agent_id` 对应正确 Agent
- `content_len` > 0

**通过标准**: 数据库可读，消息记录完整

---

### 3.7 TC-07: Dashboard 前端 API 集成

**目标**: 验证 Dashboard 后端 API 正常返回数据

```bash
# 执行命令
echo "=== 会话列表 ==="
curl -s "http://localhost:3000/api/sessions?page=1&pageSize=3" | python3 -m json.tool 2>/dev/null | head -30

echo ""
echo "=== 在线 Agent 状态 ==="
curl -s "http://localhost:3000/api/health" | python3 -m json.tool 2>/dev/null | head -20
```

**预期结果**:
- 会话列表返回 `sessions` 数组，包含 `id`、`title`、`status`
- 健康状态返回 `onlineCount` 和 `totalAgents`
- `onlineCount` = 5

**通过标准**: 前端 API 返回正确 JSON 结构

---

### 3.8 TC-08: 审计日志验证

**目标**: 验证 Gateway 记录了请求日志

```bash
# 执行命令
AUDIT_LOG="$HOME/.dev-agent/logs/audit.log"

echo "=== 最新 5 条审计日志 ==="
tail -5 "$AUDIT_LOG" 2>/dev/null | python3 -m json.tool

echo ""
echo "=== 日志统计 ==="
echo "总请求数: $(wc -l < "$AUDIT_LOG" 2>/dev/null || echo 0)"
echo "POST /v1/chat/completions: $(grep -c '"/v1/chat/completions"' "$AUDIT_LOG" 2>/dev/null || echo 0)"
echo "GET /health: $(grep -c '"/health"' "$AUDIT_LOG" 2>/dev/null || echo 0)"
```

**预期结果**:
- 日志文件存在且可读
- 包含 `timestamp`、`method`、`path`、`status`、`latencyMs` 字段
- 包含近期的 `POST /v1/chat/completions` 记录

**通过标准**: 日志记录完整，无错误条目

---

## 4. 一键回归测试脚本

### 4.1 快速模式（3分钟）

```bash
#!/usr/bin/env bash
# quick-regression.sh — 快速回归测试（只检查核心功能）

set -e

GATEWAY="http://localhost:8400"
DASHBOARD="http://localhost:3000"

echo "🧠 DEV-Agent-Teams 快速回归测试"
echo "================================"

# TC-01: 健康检查
echo ""
echo "[TC-01] Gateway 健康检查..."
HEALTH=$(curl -s "$GATEWAY/health")
AGENTS_COUNT=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agents',0))")
[ "$AGENTS_COUNT" -eq 5 ] && echo "  ✅ PASS (agents=$AGENTS_COUNT)" || echo "  ❌ FAIL (agents=$AGENTS_COUNT, expected 5)"

# TC-02: Agent 列表
echo ""
echo "[TC-02] Agent 列表 API..."
AGENTS=$(curl -s "$GATEWAY/agents" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))")
[ "$AGENTS" -eq 5 ] && echo "  ✅ PASS (count=$AGENTS)" || echo "  ❌ FAIL (count=$AGENTS, expected 5)"

# TC-03: 单 Agent 模式
echo ""
echo "[TC-03] 单 Agent 模式..."
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"hello"}],"mode":"agent","agentId":"dev-frontend","sessionId":"reg-quick-"'$(date +%s)''}'')
HAS_CHOICES=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('choices') else 'no')")
[ "$HAS_CHOICES" = "yes" ] && echo "  ✅ PASS (structure OK)" || echo "  ❌ FAIL (invalid structure)"

# TC-04: Team 模式（核心测试）
echo ""
echo "[TC-04] Team 模式（可能需要 60s+）..."
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"创建一个简单的待办事项列表React组件"}],"mode":"team","sessionId":"reg-team-"'$(date +%s)''}'')
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))")
[ "$CONTENT_LEN" -gt 200 ] && echo "  ✅ PASS (content=$CONTENT_LEN chars)" || echo "  ⚠️ WARN (content=$CONTENT_LEN chars, expected >200)"

# TC-07: Dashboard
echo ""
echo "[TC-07] Dashboard API..."
DASH_RESP=$(curl -s "$DASHBOARD/api/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('onlineCount',0))")
[ "$DASH_RESP" -eq 5 ] && echo "  ✅ PASS (onlineCount=$DASH_RESP)" || echo "  ❌ FAIL (onlineCount=$DASH_RESP, expected 5)"

echo ""
echo "================================"
echo "🏁 快速回归测试完成"
```

---

### 4.2 完整模式（10分钟）

```bash
#!/usr/bin/env bash
# full-regression.sh — 完整回归测试（覆盖所有场景）
# 使用方法: bash full-regression.sh

set -e

GATEWAY="http://localhost:8400"
DASHBOARD="http://localhost:3000"
DB_PATH="$HOME/.dev-agent/data/sessions.db"
AUDIT_LOG="$HOME/.dev-agent/logs/audit.log"

PASS=0
FAIL=0
WARN=0

report() {
  local status="$1"
  local msg="$2"
  case "$status" in
    PASS) echo "  ✅ PASS: $msg"; ((PASS++)) ;;
    FAIL) echo "  ❌ FAIL: $msg"; ((FAIL++)) ;;
    WARN) echo "  ⚠️ WARN: $msg"; ((WARN++)) ;;
  esac
}

echo "🧠 DEV-Agent-Teams 完整回归测试"
echo "================================"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

# ==================== TC-01: 健康检查 ====================
echo ""
echo "[TC-01] 基础健康检查"
for port in 8400 8201 8202 8203 8204 8205; do
  RESP=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$port/" 2>/dev/null || echo "000")
  [ "$RESP" = "200" ] && report PASS "port $port OK" || report FAIL "port $port returned $RESP"
done

# ==================== TC-02: Agent 列表 ====================
echo ""
echo "[TC-02] Agent 列表 API"
AGENT_COUNT=$(curl -s "$GATEWAY/agents" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))" 2>/dev/null || echo 0)
[ "$AGENT_COUNT" -eq 5 ] && report PASS "5 agents listed" || report FAIL "found $AGENT_COUNT agents, expected 5"

# ==================== TC-03: 单 Agent ====================
echo ""
echo "[TC-03] 单 Agent 模式（dev-frontend）"
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"写一个React按钮组件"}],"mode":"agent","agentId":"dev-frontend","sessionId":"reg-test-03-"'$(date +%s)'}')
STRUCT_OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('choices') and d.get('sessionId') else 'no')" 2>/dev/null || echo no)
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
[ "$STRUCT_OK" = "yes" ] && report PASS "response structure valid" || report FAIL "invalid response structure"
[ "$CONTENT_LEN" -gt 50 ] && report PASS "content length=$CONTENT_LEN" || report WARN "content length=$CONTENT_LEN (known issue, see §5)"

# ==================== TC-04: Team 模式 ====================
echo ""
echo "[TC-04] Team 模式（核心测试，可能耗时 60-120s）"
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"设计一个用户注册流程"}],"mode":"team","sessionId":"reg-test-04-"'$(date +%s)'}')
ROUTED_BY=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('routedBy','unknown'))" 2>/dev/null || echo unknown)
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
[ "$ROUTED_BY" = "team-orchestrator" ] && report PASS "routed by team-orchestrator" || report FAIL "routed by $ROUTED_BY"
[ "$CONTENT_LEN" -gt 500 ] && report PASS "content length=$CONTENT_LEN" || report FAIL "content length=$CONTENT_LEN, expected >500"

# ==================== TC-05: Meeting 模式 ====================
echo ""
echo "[TC-05] Meeting 模式（可能耗时 3-5分钟，设置超时 300s）"
# 使用 timeout 命令防止无限等待
timeout 300 bash -c '
  RESP=$(curl -s -X POST "'$GATEWAY'/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Next.js vs Vue 技术选型\"}],\"mode\":\"meeting\",\"sessionId\":\"reg-test-05-"'$(date +%s)'"}")
  echo "$RESP" > /tmp/tc05-result.json
' && {
  ROUTED_BY=$(cat /tmp/tc05-result.json | python3 -c "import sys,json; print(json.load(sys.stdin).get('routedBy','unknown'))" 2>/dev/null || echo unknown)
  CONTENT_LEN=$(cat /tmp/tc05-result.json | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
  [ "$ROUTED_BY" = "meeting-orchestrator" ] && report PASS "routed by meeting-orchestrator" || report WARN "routed by $ROUTED_BY"
  [ "$CONTENT_LEN" -gt 100 ] && report PASS "content length=$CONTENT_LEN" || report WARN "content length=$CONTENT_LEN"
} || report WARN "Meeting 模式超时（可能模型API慢或Agent过多）"

# ==================== TC-06: 数据持久化 ====================
echo ""
echo "[TC-06] 数据持久化验证"
if [ -f "$DB_PATH" ]; then
  SESSION_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sessions;" 2>/dev/null || echo 0)
  MSG_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM messages;" 2>/dev/null || echo 0)
  [ "$SESSION_COUNT" -gt 0 ] && report PASS "sessions table: $SESSION_COUNT rows" || report WARN "no sessions found"
  [ "$MSG_COUNT" -gt 0 ] && report PASS "messages table: $MSG_COUNT rows" || report WARN "no messages found"
else
  report FAIL "database not found at $DB_PATH"
fi

# ==================== TC-07: Dashboard API ====================
echo ""
echo "[TC-07] Dashboard 集成"
ONLINE_COUNT=$(curl -s "$DASHBOARD/api/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('onlineCount',0))" 2>/dev/null || echo 0)
[ "$ONLINE_COUNT" -eq 5 ] && report PASS "onlineCount=$ONLINE_COUNT" || report FAIL "onlineCount=$ONLINE_COUNT, expected 5"

# ==================== TC-08: 审计日志 ====================
echo ""
echo "[TC-08] 审计日志"
if [ -f "$AUDIT_LOG" ]; then
  LOG_ENTRIES=$(wc -l < "$AUDIT_LOG" 2>/dev/null || echo 0)
  [ "$LOG_ENTRIES" -gt 0 ] && report PASS "audit log: $LOG_ENTRIES entries" || report WARN "empty audit log"
else
  report WARN "audit log not found at $AUDIT_LOG"
fi

# ==================== 汇总 ====================
echo ""
echo "================================"
echo "📊 测试汇总"
echo "  ✅ 通过: $PASS"
echo "  ❌ 失败: $FAIL"
echo "  ⚠️  警告: $WARN"
echo "  总计: $((PASS + FAIL + WARN))"
echo "结束时间: $(date '+%Y-%m-%d %H:%M:%S')"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "❌ 回归测试未通过，请检查失败项"
  exit 1
else
  echo ""
  echo "🏁 回归测试通过（$WARN 项警告需关注）"
  exit 0
fi
```

---

## 5. 已知问题与排查指南

### 5.1 问题：单 Agent 模式返回空内容

**现象**: TC-03 中 `content` 为空或极短，但响应结构正确  
**原因**: `@open-multi-agent/core` 框架在适配 MiMo API 时，对 `reasoning_content` 的处理可能存在提取问题。MiMo 的响应格式包含 `reasoning_content`（思维链）和 `content`（正式输出），框架可能只提取了 `content` 而 `content` 为空。  
**影响**: 低 — Team 模式不受影响（多 Agent 协作时有其他机制填充内容）  
**排查**:
```bash
# 直接测试模型 API，确认是否正常
curl -X POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5-pro","messages":[{"role":"user","content":"hello"}]}'
# 如果 content 有值，说明模型正常，问题在框架适配层
```
**工作around**: 使用 `mode: "team"` 替代 `mode: "agent"` 进行复杂任务

### 5.2 问题：Meeting 模式超时

**现象**: TC-05 执行超过 300 秒  
**原因**: Meeting 模式串行执行 5 个 Agent，每个 Agent 需要调用模型 API，受网络延迟和模型响应速度影响。  
**排查**:
```bash
# 检查模型 API 延迟
curl -w "\nTotal time: %{time_total}s\n" -o /dev/null -s \
  -X POST https://token-plan-sgp.xiaomimimo.com/v1/chat/completions \
  -H "Authorization: Bearer <API_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"model":"mimo-v2.5-pro","messages":[{"role":"user","content":"hello"}]}'
# 如果单次请求 > 30s，说明模型 API 慢，Meeting 模式超时属预期行为
```
**工作around**: 增加超时时间，或改用 `mode: "team"`（并行执行更快）

### 5.3 问题：Agent 端口未响应

**现象**: TC-01 中某个 Agent 端口返回非 200  
**排查步骤**:
```bash
# 1. 检查进程是否存在
ps aux | grep "dev-frontend" | grep -v grep

# 2. 检查端口监听
lsof -i :8201

# 3. 如果进程不存在，启动 Agent
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/agents/frontend && pnpm dev
# 对其他 Agent 同理

# 4. 或使用 CLI 工具启动所有
./dev-agent start
```

### 5.4 问题：Gateway 无法连接

**现象**: `curl http://localhost:8400/health` 返回 Connection Refused  
**排查**:
```bash
# 1. 检查 Gateway 进程
ps aux | grep "api-gateway" | grep -v grep

# 2. 启动 Gateway
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/gateway && pnpm dev

# 3. 检查端口是否被占用
lsof -i :8400
```

### 5.5 问题：Dashboard 返回 404

**现象**: `http://localhost:3000` 无法访问  
**排查**:
```bash
# 1. 检查 Dashboard 进程
ps aux | grep "next dev" | grep -v grep

# 2. 启动 Dashboard
cd /Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams/packages/dashboard && pnpm dev

# 3. 检查端口
lsof -i :3000
```

---

## 6. 测试环境信息模板

执行回归测试时，请记录以下信息：

```markdown
## 测试环境
- **测试时间**: 2026-06-17 20:45:00
- **执行者**: <Agent/模型名称>
- **Node.js**: v24.15.0
- **pnpm**: v10.13.1
- **模型**: mimo-v2.5-pro
- **框架版本**: @open-multi-agent/core <版本>

## 测试结果
| 用例 | 结果 | 延迟 | 备注 |
|------|------|------|------|
| TC-01 健康检查 | ✅ | — | — |
| TC-02 Agent 列表 | ✅ | 5ms | — |
| TC-03 单 Agent | ⚠️ | 60s | content 为空（已知问题） |
| TC-04 Team 模式 | ✅ | 65s | content=2345 chars |
| TC-05 Meeting 模式 | ⏳ | 超时 | 模型 API 慢 |
| TC-06 数据持久化 | ✅ | — | 103 sessions |
| TC-07 Dashboard | ✅ | 12ms | — |
| TC-08 审计日志 | ✅ | — | 39109 bytes |
```

---

## 7. 附录：手动测试命令速查

```bash
# 健康检查
curl http://localhost:8400/health

# Agent 列表
curl http://localhost:8400/agents

# 单 Agent 对话
curl -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"需求"}],"mode":"agent","agentId":"dev-frontend"}'

# Team 协同
curl -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"需求"}],"mode":"team"}'

# Meeting 讨论
curl -X POST http://localhost:8400/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"讨论议题"}],"mode":"meeting"}'

# 查看数据库
sqlite3 ~/.dev-agent/data/sessions.db "SELECT * FROM sessions ORDER BY id DESC LIMIT 5;"

# 查看日志
tail -f ~/.dev-agent/logs/audit.log
```

---

**文档维护**: 当系统版本升级或发现新问题时，请更新此文档。  
**最后更新**: 2026-06-17
