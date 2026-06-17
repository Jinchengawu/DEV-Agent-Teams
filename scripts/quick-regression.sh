#!/usr/bin/env bash
# quick-regression.sh — DEV-Agent-Teams 快速回归测试（约3分钟）
# 用法: bash scripts/quick-regression.sh

set -e

GATEWAY="http://localhost:8400"
DASHBOARD="http://localhost:3000"

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

echo "🧠 DEV-Agent-Teams 快速回归测试"
echo "================================"
echo "开始时间: $(date '+%Y-%m-%d %H:%M:%S')"

# TC-01: 健康检查
echo ""
echo "[TC-01] Gateway 健康检查"
HEALTH=$(curl -s "$GATEWAY/health" 2>/dev/null || echo '{}')
AGENTS_COUNT=$(echo "$HEALTH" | python3 -c "import sys,json; print(json.load(sys.stdin).get('agents',0))" 2>/dev/null || echo 0)
[ "$AGENTS_COUNT" -eq 5 ] && report PASS "agents=$AGENTS_COUNT" || report FAIL "agents=$AGENTS_COUNT, expected 5"

# TC-02: Agent 列表
echo ""
echo "[TC-02] Agent 列表 API"
AGENTS=$(curl -s "$GATEWAY/agents" 2>/dev/null || echo '{}')
AGENT_COUNT=$(echo "$AGENTS" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('agents',[])))" 2>/dev/null || echo 0)
[ "$AGENT_COUNT" -eq 5 ] && report PASS "count=$AGENT_COUNT" || report FAIL "count=$AGENT_COUNT, expected 5"

# TC-03: 单 Agent 模式
echo ""
echo "[TC-03] 单 Agent 模式（dev-frontend）"
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"写一个React按钮组件\"}],\"mode\":\"agent\",\"agentId\":\"dev-frontend\",\"sessionId\":\"reg-quick-"$(date +%s)"\"}" 2>/dev/null || echo '{}')
HAS_CHOICES=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print('yes' if d.get('choices') else 'no')" 2>/dev/null || echo no)
[ "$HAS_CHOICES" = "yes" ] && report PASS "response structure valid" || report FAIL "invalid response structure"

# TC-04: Team 模式（核心测试）
echo ""
echo "[TC-04] Team 模式（约60s）"
RESP=$(curl -s -X POST "$GATEWAY/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{\"messages\":[{\"role\":\"user\",\"content\":\"创建一个简单的待办事项列表React组件\"}],\"mode\":\"team\",\"sessionId\":\"reg-team-"$(date +%s)"\"}" 2>/dev/null || echo '{}')
CONTENT_LEN=$(echo "$RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); c=d.get('choices',[{}])[0].get('message',{}).get('content',''); print(len(c))" 2>/dev/null || echo 0)
[ "$CONTENT_LEN" -gt 200 ] && report PASS "content=$CONTENT_LEN chars" || report WARN "content=$CONTENT_LEN chars, expected >200"

# TC-07: Dashboard
echo ""
echo "[TC-07] Dashboard API"
DASH_RESP=$(curl -s "$DASHBOARD/api/health" 2>/dev/null || echo '{}')
ONLINE_COUNT=$(echo "$DASH_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('onlineCount',0))" 2>/dev/null || echo 0)
[ "$ONLINE_COUNT" -eq 5 ] && report PASS "onlineCount=$ONLINE_COUNT" || report FAIL "onlineCount=$ONLINE_COUNT, expected 5"

# 汇总
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
