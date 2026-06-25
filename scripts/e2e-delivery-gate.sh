#!/usr/bin/env bash
# e2e-delivery-gate.sh — closed-loop delivery verification for DEV-Agent-Teams.
#
# Default mode is safe for every local development turn. It verifies the code and
# product spine without requiring long-running Hermes Agent instances.
#
# Set RUN_LIVE_PIPELINE=1 to execute the built-in lifecycle pipeline through the
# running Gateway. This may call external model APIs and take several minutes.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GATEWAY_URL="${GATEWAY_URL:-http://localhost:8400}"
DASHBOARD_URL="${DASHBOARD_URL:-http://localhost:3000}"
REPORT_DIR="$ROOT/scripts/test-reports"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
REPORT_FILE="$REPORT_DIR/e2e-delivery-gate-$TIMESTAMP.md"

PASS=0
FAIL=0
WARN=0

mkdir -p "$REPORT_DIR"

write_report_header() {
  cat > "$REPORT_FILE" <<EOF
# E2E Delivery Gate

- Time: $(date)
- Root: $ROOT
- Gateway: $GATEWAY_URL
- Dashboard: $DASHBOARD_URL
- Live pipeline: ${RUN_LIVE_PIPELINE:-0}

| Check | Status | Details |
| --- | --- | --- |
EOF
}

record() {
  local name="$1"
  local status="$2"
  local details="$3"

  case "$status" in
    PASS) PASS=$((PASS + 1)); echo "  PASS $name — $details" ;;
    FAIL) FAIL=$((FAIL + 1)); echo "  FAIL $name — $details" ;;
    WARN) WARN=$((WARN + 1)); echo "  WARN $name — $details" ;;
    *) echo "unknown status: $status" >&2; exit 2 ;;
  esac

  printf '| %s | %s | %s |\n' "$name" "$status" "$details" >> "$REPORT_FILE"
}

run_cmd() {
  local name="$1"
  shift
  local output

  set +e
  output="$("$@" 2>&1)"
  local code=$?
  set -e

  if [ "$code" -eq 0 ]; then
    record "$name" PASS "command succeeded"
  else
    record "$name" FAIL "exit $code: $(echo "$output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi
}

json_field() {
  python3 -c 'import json,sys; data=json.load(sys.stdin); cur=data
for part in sys.argv[1].split("."):
    if isinstance(cur, list):
        cur = cur[int(part)]
    else:
        cur = cur.get(part)
print("" if cur is None else cur)' "$1"
}

write_report_header

echo "E2E Delivery Gate"
echo "================="

cd "$ROOT"

run_cmd "core typecheck" pnpm --filter @dev-agent/core run check
run_cmd "gateway build" pnpm --filter @dev-agent/gateway run build
run_cmd "dashboard typecheck" pnpm --filter @dev-agent/dashboard exec tsc --noEmit

for file in \
  "CONTEXT.md" \
  "docs/architecture/team-coordination-loop.md" \
  "docs/adr/002-team-coordination-layer.md" \
  "packages/core/src/lifecycle/dev-team-minimum-loop.ts"
do
  if [ -f "$file" ]; then
    record "required file: $file" PASS "present"
  else
    record "required file: $file" FAIL "missing"
  fi
done

if rg -q "DEV_TEAM_MINIMUM_LOOP_PIPELINE" packages/core/src/agent-factory.ts packages/core/src/index.ts; then
  record "minimum lifecycle wired" PASS "Core loads and exports dev-team-minimum-loop"
else
  record "minimum lifecycle wired" FAIL "pipeline is not wired into Core"
fi

if curl -fsS "$GATEWAY_URL/health" >/tmp/dev-agent-health.json 2>/dev/null; then
  agents="$(json_field agents < /tmp/dev-agent-health.json 2>/dev/null || echo "")"
  record "gateway health" PASS "agents=${agents:-unknown}"

  if curl -fsS "$GATEWAY_URL/pipelines" >/tmp/dev-agent-pipelines.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
pipelines = data.get("pipelines", [])
raise SystemExit(0 if any(p.get("id") == "dev-team-minimum-loop" for p in pipelines) else 1)' /tmp/dev-agent-pipelines.json
    then
      record "gateway pipeline registry" PASS "dev-team-minimum-loop is listed"
    else
      record "gateway pipeline registry" FAIL "dev-team-minimum-loop not listed"
    fi
  else
    record "gateway pipeline registry" FAIL "GET /pipelines failed"
  fi

  if curl -fsS "$GATEWAY_URL/v1/workflows" >/tmp/dev-agent-workflows.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
raise SystemExit(0 if isinstance(data.get("workflows"), list) else 1)' /tmp/dev-agent-workflows.json
    then
      record "gateway workflow registry" PASS "GET /v1/workflows returns a workflow list"
    else
      record "gateway workflow registry" FAIL "GET /v1/workflows returned an invalid payload"
    fi
  else
    record "gateway workflow registry" FAIL "GET /v1/workflows failed"
  fi

  if curl -fsS "$GATEWAY_URL/v1/templates" >/tmp/dev-agent-templates.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
templates = data.get("templates", [])
raise SystemExit(0 if any(t.get("id") == "dev-team-minimum-loop" for t in templates) else 1)' /tmp/dev-agent-templates.json
    then
      record "gateway workflow templates" PASS "dev-team-minimum-loop is available as a workflow template"
    else
      record "gateway workflow templates" FAIL "dev-team-minimum-loop template not listed"
    fi
  else
    record "gateway workflow templates" FAIL "GET /v1/templates failed"
  fi
else
  record "gateway health" WARN "Gateway is not running; skipped live HTTP checks"
fi

if curl -fsS "$DASHBOARD_URL/" >/tmp/dev-agent-dashboard.html 2>/dev/null; then
  record "dashboard root" PASS "Dashboard is reachable"

  if curl -fsS "$DASHBOARD_URL/api/v2/documents" >/tmp/dev-agent-dashboard-docs.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
raise SystemExit(0 if isinstance(data.get("documents"), list) else 1)' /tmp/dev-agent-dashboard-docs.json
    then
      record "dashboard v2 document proxy" PASS "GET /api/v2/documents returns documents"
    else
      record "dashboard v2 document proxy" FAIL "GET /api/v2/documents returned an invalid payload"
    fi
  else
    record "dashboard v2 document proxy" FAIL "GET /api/v2/documents failed"
  fi

  if curl -fsS "$DASHBOARD_URL/api/workflows" >/tmp/dev-agent-dashboard-workflows.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
raise SystemExit(0 if isinstance(data.get("workflows"), list) else 1)' /tmp/dev-agent-dashboard-workflows.json
    then
      record "dashboard workflow proxy" PASS "GET /api/workflows returns workflows"
    else
      record "dashboard workflow proxy" FAIL "GET /api/workflows returned an invalid payload"
    fi
  else
    record "dashboard workflow proxy" FAIL "GET /api/workflows failed"
  fi

  if curl -fsS "$DASHBOARD_URL/api/workflows/templates" >/tmp/dev-agent-dashboard-templates.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
templates = data.get("templates", [])
raise SystemExit(0 if any(t.get("id") == "dev-team-minimum-loop" for t in templates) else 1)' /tmp/dev-agent-dashboard-templates.json
    then
      record "dashboard workflow templates proxy" PASS "dev-team-minimum-loop template is available"
    else
      record "dashboard workflow templates proxy" FAIL "dev-team-minimum-loop template not listed"
    fi
  else
    record "dashboard workflow templates proxy" FAIL "GET /api/workflows/templates failed"
  fi
else
  record "dashboard root" WARN "Dashboard is not running; skipped Dashboard HTTP checks"
fi

if [ "${RUN_LIVE_PIPELINE:-0}" = "1" ]; then
  live_request="${E2E_LIVE_USER_REQUEST:-E2E delivery gate dry-run: verify the dev-team-minimum-loop coordination lifecycle only. Produce markdown-only planning artifacts. Do not create, edit, delete, install, build, or write repository files. Do not run package managers. If a surface would normally implement code, describe the intended artifact and verification evidence instead.}"
  payload="$(E2E_LIVE_REQUEST="$live_request" python3 -c 'import json, os
print(json.dumps({
    "pipelineId": "dev-team-minimum-loop",
    "initialInput": {"userRequest": os.environ["E2E_LIVE_REQUEST"]},
}))')"

  if curl -fsS -X POST "$GATEWAY_URL/v1/pipeline/execute" \
    -H "Content-Type: application/json" \
    -d "$payload" >/tmp/dev-agent-pipeline-run.json; then
    status="$(json_field status < /tmp/dev-agent-pipeline-run.json 2>/dev/null || echo unknown)"
    instance_id="$(json_field instanceId < /tmp/dev-agent-pipeline-run.json 2>/dev/null || echo unknown)"
    if [ "$status" = "completed" ]; then
      record "live minimum lifecycle pipeline" PASS "instance=$instance_id status=$status"
    else
      failed_surfaces="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
surfaces = data.get("surfaceResults", {}) or {}
failed = []
for name, result in surfaces.items():
    if result.get("status") == "failed":
        failed.append("{}: {}".format(name, result.get("error", "unknown error")))
print("; ".join(failed) or "no failed surface detail")' /tmp/dev-agent-pipeline-run.json | sed 's/|/\\|/g')"
      record "live minimum lifecycle pipeline" FAIL "instance=$instance_id status=$status; $failed_surfaces"
    fi
  else
    record "live minimum lifecycle pipeline" FAIL "pipeline execution request failed"
  fi
else
  record "live minimum lifecycle pipeline" WARN "skipped; set RUN_LIVE_PIPELINE=1 when Hermes Agents are available"
fi

{
  echo ""
  echo "## Summary"
  echo ""
  echo "- PASS: $PASS"
  echo "- FAIL: $FAIL"
  echo "- WARN: $WARN"
} >> "$REPORT_FILE"

echo ""
echo "Summary: PASS=$PASS FAIL=$FAIL WARN=$WARN"
echo "Report: $REPORT_FILE"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
