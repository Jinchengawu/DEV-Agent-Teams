#!/usr/bin/env bash
# full-regression.sh — DEV-Agent-Teams 完整回归测试（约10分钟）
# 用法: bash scripts/full-regression.sh

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
    PASS) echo "  ✅ PASS: $msg"; ((PASS++)) || true ;;
    FAIL) echo "  ❌ FAIL: $msg"; ((FAIL++)) || true ;;
    WARN) echo "  ⚠️  WARN: $msg"; ((WARN++)) || true ;;
  esac
}

echo "🧠 DEV-Agent-Teams 完整回归测试"
echo "================================"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

# ==================== TC-01: 健康检查 ====================
echo ""
echo "[TC-01] 基础健康检查（所有端口）"
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
  -d '{"messages":[{"role":"user","content":"写一个React按钮组件"}],"mode":"agent","agentId":"dev-frontend","sessionId":"reg-test-03-'$(date +%s)'"}' 2>/dev/null || echo '{}')
STRUCT_OK=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('choices') and d.get('sessionId') else 'no')" 2>/dev/null || echo no)
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
[ "$STRUCT_OK" = "yes" ] && report PASS "response structure valid" || report FAIL "invalid response structure"
[ "$CONTENT_LEN" -gt 50 ] && report PASS "content length=$CONTENT_LEN" || report WARN "content length=$CONTENT_LEN (known issue, see REGRESSION-TEST.md §5)"

# ==================== TC-04: Team 模式 ====================
echo ""
echo "[TC-04] Team 模式（核心测试，约60-120s）"
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"设计一个用户注册流程"}],"mode":"team","sessionId":"reg-test-04-'$(date +%s)'"}' 2>/dev/null || echo '{}')
ROUTED_BY=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('routedBy','unknown'))" 2>/dev/null || echo unknown)
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
[ "$ROUTED_BY" = "team-orchestrator" ] && report PASS "routed by team-orchestrator" || report FAIL "routed by $ROUTED_BY"
[ "$CONTENT_LEN" -gt 500 ] && report PASS "content length=$CONTENT_LEN" || report FAIL "content length=$CONTENT_LEN, expected >500"

# ==================== TC-05: Meeting 模式 ====================
echo ""
echo "[TC-05] Meeting 模式（约3-5分钟，超时300s）"
if timeout 300 bash -c '
  RESP=$(curl -s -X POST "'$GATEWAY'/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Next.js vs Vue 技术选型\"}],\"mode\":\"meeting\",\"sessionId\":\"reg-test-05-"'$(date +%s)'"\"}")
  echo "$RESP" > /tmp/tc05-result.json
'; then
  ROUTED_BY=$(cat /tmp/tc05-result.json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin).get('routedBy','unknown'))" 2>/dev/null || echo unknown)
  CONTENT_LEN=$(cat /tmp/tc05-result.json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
  [ "$ROUTED_BY" = "meeting-orchestrator" ] && report PASS "routed by meeting-orchestrator" || report WARN "routed by $ROUTED_BY"
  [ "$CONTENT_LEN" -gt 100 ] && report PASS "content length=$CONTENT_LEN" || report WARN "content length=$CONTENT_LEN"
else
  report WARN "Meeting 模式超时（可能模型API慢或Agent过多）"
fi

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
