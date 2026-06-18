#!/usr/bin/env bash
# phase1-acceptance.sh — 阶段1验收脚本

OPEN="/Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams"
DEV="/Users/zhuizhui/网盘同步/work/学习/AI/DEV-Agent-Teams"
PASS=0
FAIL=0

check() {
  local desc="$1"
  local cmd="$2"
  local expected="$3"
  local result=$(eval "$cmd" 2>&1)
  if echo "$result" | grep -qF -- "$expected"; then
    echo "  ✅ $desc"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $desc"
    echo "     期望: $expected"
    echo "     实际: $result"
    FAIL=$((FAIL + 1))
  fi
}

echo "🧪 阶段1 验收测试"
echo "================"

check "TC-01 Open 包名" "cat $OPEN/packages/core/package.json | grep '\"name\"'" "@open-agent-teams/core"
check "TC-02 构建产物" "ls $OPEN/packages/core/dist/index.js 2>&1 && echo 'found'" "found"
check "TC-03 类型声明" "ls $OPEN/packages/core/dist/index.d.ts 2>&1 && echo 'found'" "found"
check "TC-04 DEV 依赖" "cat $DEV/packages/core/package.json | grep '@open-agent-teams/core'" "link"
check "TC-05 符号链接" "ls -la $DEV/node_modules/@open-agent-teams/core 2>&1" "->"
check "TC-06 DEV 类型检查" "cd $DEV/packages/core && pnpm check 2>&1 && echo 'OK'" "OK"
check "TC-07 Gateway 健康" "curl -s http://localhost:8400/health" '"status":"ok"'
check "TC-08 5 Agent 在线" "curl -s http://localhost:8400/agents" "dev-pm"

echo ""
echo "📊 结果: $PASS 通过, $FAIL 失败"
[ "$FAIL" -eq 0 ] && echo "🏁 验收通过" || echo "❌ 验收未通过"
