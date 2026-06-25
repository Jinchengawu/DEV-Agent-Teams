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
- Pipeline control smoke: ${RUN_PIPELINE_CONTROL_SMOKE:-0}
- Pipeline recovery smoke: ${RUN_PIPELINE_RECOVERY_SMOKE:-0}
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

    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
pipelines = data.get("pipelines", [])
raise SystemExit(0 if any(p.get("id") == "stock-analysis-system" for p in pipelines) else 1)' /tmp/dev-agent-pipelines.json
    then
      record "gateway yaml pipeline loader" PASS "stock-analysis-system is loaded from YAML"
    else
      record "gateway yaml pipeline loader" FAIL "stock-analysis-system not listed"
    fi
  else
    record "gateway pipeline registry" FAIL "GET /pipelines failed"
  fi

  set +e
  yaml_loader_output="$(GATEWAY_URL="$GATEWAY_URL" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const id = 'e2e-inline-yaml-persistent';
const yaml = `
id: ${id}
name: E2E Inline YAML Pipeline
version: "0.0.1"
surfaces:
  - id: discovery
    name: Discovery
    agent: dev-pm
    workflow:
      goal: Validate inline YAML loading.
edges: []
`;
const loadRes = await fetch(`${base}/pipelines/load-yaml`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ yaml, source: 'e2e-delivery-gate:inline' }),
});
const loaded = await loadRes.json();
if (loadRes.status !== 201 || loaded.pipeline?.id !== id) {
  throw new Error(`inline load failed: ${loadRes.status} ${JSON.stringify(loaded)}`);
}
const listRes = await fetch(`${base}/pipelines`);
const listed = await listRes.json();
if (!listed.pipelines?.some((pipeline) => pipeline.id === id)) {
  throw new Error(`inline loaded pipeline not listed: ${id}`);
}
console.log(`id=${id}`);
NODE
)"
  yaml_loader_code=$?
  set -e
  if [ "$yaml_loader_code" -eq 0 ]; then
    record "gateway inline yaml loader" PASS "$(echo "$yaml_loader_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "gateway inline yaml loader" FAIL "exit $yaml_loader_code: $(echo "$yaml_loader_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
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

  if [ "${RUN_PIPELINE_CONTROL_SMOKE:-0}" = "1" ]; then
    set +e
    control_output="$(GATEWAY_URL="$GATEWAY_URL" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const payload = {
  pipelineId: 'dev-team-minimum-loop',
  initialInput: {
    userRequest: 'E2E control smoke: start then cancel immediately. Dry-run only; do not write files.',
    requestedBy: 'e2e-delivery-gate',
  },
  options: { dryRun: true, surfaceTimeoutMs: 1000 },
};
const startRes = await fetch(`${base}/v1/pipeline/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const started = await startRes.json();
if (!startRes.ok || !started.instanceId) {
  throw new Error(`start failed: ${startRes.status} ${JSON.stringify(started)}`);
}
const startTaskCount = Object.keys(started.coordination?.taskIdsBySurface || {}).length;
if (!started.coordination?.projectId || startTaskCount !== 7) {
  throw new Error(`start response missing coordination binding: ${JSON.stringify({
    projectId: started.coordination?.projectId,
    taskCount: startTaskCount,
  })}`);
}

const cancelRes = await fetch(`${base}/pipeline-instances/${started.instanceId}/cancel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: 'E2E control smoke cancellation' }),
});
const cancelled = await cancelRes.json();
const taskCount = Object.keys(cancelled.coordination?.taskIdsBySurface || {}).length;
if (cancelRes.status !== 200 || cancelled.status !== 'cancelled' || taskCount < 1) {
  throw new Error(`cancel/status failed: ${cancelRes.status} ${JSON.stringify({
    status: cancelled.status,
    taskCount,
    projectId: cancelled.coordination?.projectId,
  })}`);
}

await new Promise((resolve) => setTimeout(resolve, 500));
const coordinationRes = await fetch(`${base}/pipeline-instances/${started.instanceId}/coordination`);
const coordination = await coordinationRes.json();
if (!coordinationRes.ok) {
  throw new Error(`coordination failed: ${coordinationRes.status} ${JSON.stringify(coordination)}`);
}
const statuses = coordination.bindings.map((binding) => binding.task?.status);
const blockedCount = statuses.filter((status) => status === 'blocked').length;
if (blockedCount !== coordination.bindings.length) {
  throw new Error(`cancel did not block all tasks: ${JSON.stringify(statuses)}`);
}
const experienceDocId = coordination.instance?.coordination?.documentIdsBySurface?._experience;
const retroBinding = coordination.bindings.find((binding) => binding.surfaceId === 'retrospective');
const retroDocIds = (retroBinding?.documents || []).map((doc) => doc.id);
if (!experienceDocId || !retroDocIds.includes(experienceDocId)) {
  throw new Error(`experience document was not captured or linked: ${JSON.stringify({
    experienceDocId,
    retroDocIds,
  })}`);
}

const controlChecks = [
  ['pause', { url: `${base}/pipeline-instances/${started.instanceId}/pause`, body: {} }],
  ['resume', { url: `${base}/pipeline-instances/${started.instanceId}/resume`, body: {} }],
  ['rollback', { url: `${base}/pipeline-instances/${started.instanceId}/rollback`, body: { surfaceId: 'planning' } }],
];
for (const [name, request] of controlChecks) {
  const res = await fetch(request.url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request.body),
  });
  const data = await res.json();
  if (res.ok || data.supported !== false || !data.error) {
    throw new Error(`${name} control should fail honestly: ${res.status} ${JSON.stringify(data)}`);
  }
}

console.log(`instance=${started.instanceId} project=${started.coordination.projectId} startTasks=${startTaskCount} tasks=${taskCount} blocked=${blockedCount} experience=${experienceDocId} unsupportedControls=3`);
NODE
)"
    control_code=$?
    set -e
    if [ "$control_code" -eq 0 ]; then
      record "pipeline control smoke" PASS "$(echo "$control_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "pipeline control smoke" FAIL "exit $control_code: $(echo "$control_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  else
    record "pipeline control smoke" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify start/cancel/coordination binding"
  fi

  if [ "${RUN_PIPELINE_RECOVERY_SMOKE:-0}" = "1" ]; then
    set +e
    recovery_output="$(GATEWAY_URL="$GATEWAY_URL" ROOT="$ROOT" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const payload = {
  pipelineId: 'dev-team-minimum-loop',
  initialInput: {
    userRequest: 'E2E recovery smoke: start, restart Gateway while running, then recover interrupted workflow state. Dry-run only; do not write files.',
    requestedBy: 'e2e-delivery-gate-recovery',
  },
  options: { dryRun: true, surfaceTimeoutMs: 90000 },
};
const startRes = await fetch(`${base}/v1/pipeline/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const started = await startRes.json();
if (!startRes.ok || !started.instanceId) {
  throw new Error(`start failed: ${startRes.status} ${JSON.stringify(started)}`);
}

console.log(JSON.stringify({
  instanceId: started.instanceId,
}));
NODE
)"
    recovery_code=$?
    if [ "$recovery_code" -eq 0 ]; then
      recovery_json="$(echo "$recovery_output" | tail -n 1)"
      instance_id="$(printf '%s' "$recovery_json" | python3 -c 'import json,sys; print(json.load(sys.stdin)["instanceId"])' 2>/dev/null)"

      screen -S dev-agent-gateway -X quit >/dev/null 2>&1 || true
      gateway_pid="$(lsof -tiTCP:8400 -sTCP:LISTEN 2>/dev/null || true)"
      if [ -n "$gateway_pid" ]; then kill $gateway_pid >/dev/null 2>&1 || true; fi
      sleep 2
      screen -dmS dev-agent-gateway bash -lc "cd '$ROOT/packages/gateway' && env PATH=/Users/zhuizhui/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:\$PATH GATEWAY_PORT=8400 ./node_modules/.bin/tsx src/api-gateway.ts 2>&1 | tee -a ../../.codex-run/logs/gateway-screen.log"
      sleep 5

      verify_output="$(GATEWAY_URL="$GATEWAY_URL" INSTANCE_ID="$instance_id" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const instanceId = process.env.INSTANCE_ID;
const res = await fetch(`${base}/pipeline-instances/${instanceId}/coordination`);
const summary = await res.json();
const taskCount = Object.keys(summary.instance?.coordination?.taskIdsBySurface || {}).length;
const statuses = summary.bindings?.map((binding) => binding.task?.status) || [];
const blockedCount = statuses.filter((status) => status === 'blocked').length;
const experienceDocId = summary.instance?.coordination?.documentIdsBySurface?._experience;
const retroBinding = summary.bindings?.find((binding) => binding.surfaceId === 'retrospective');
const retroDocIds = (retroBinding?.documents || []).map((doc) => doc.id);
if (
  res.status !== 200 ||
  summary.instance?.id !== instanceId ||
  summary.instance?.status !== 'failed' ||
  !String(summary.instance?.error || '').includes('Gateway restart') ||
  taskCount < 1 ||
  blockedCount !== statuses.length ||
  !experienceDocId ||
  !retroDocIds.includes(experienceDocId)
) {
  throw new Error(`recovery failed: ${res.status} ${JSON.stringify({
    id: summary.instance?.id,
    status: summary.instance?.status,
    error: summary.instance?.error,
    projectId: summary.instance?.coordination?.projectId,
    taskCount,
    statuses,
    experienceDocId,
    retroDocIds,
  })}`);
}
const pipelinesRes = await fetch(`${base}/pipelines`);
const pipelines = await pipelinesRes.json();
if (!pipelines.pipelines?.some((pipeline) => pipeline.id === 'e2e-inline-yaml-persistent')) {
  throw new Error('persistent inline YAML pipeline was not restored after Gateway restart');
}
console.log(`instance=${instanceId} project=${summary.instance?.coordination?.projectId || 'none'} tasks=${taskCount} blocked=${blockedCount} experience=${experienceDocId} yamlRestored=1`);
NODE
)"
      recovery_code=$?
      if [ "$recovery_code" -eq 0 ]; then
        record "pipeline recovery smoke" PASS "$(echo "$verify_output" | tail -n 1 | sed 's/|/\\|/g')"
      else
        record "pipeline recovery smoke" FAIL "exit $recovery_code: $(echo "$verify_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
      fi
    else
      record "pipeline recovery smoke" FAIL "exit $recovery_code: $(echo "$recovery_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
    set -e
  else
    record "pipeline recovery smoke" WARN "skipped; set RUN_PIPELINE_RECOVERY_SMOKE=1 to verify restart recovery"
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

  if [ "${RUN_PIPELINE_CONTROL_SMOKE:-0}" = "1" ]; then
    set +e
    dashboard_control_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const res = await fetch(`${base}/api/pipeline-instances/__missing__/pause`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const data = await res.json();
if (res.ok || data.supported !== false || !data.error) {
  throw new Error(`dashboard pause proxy should fail honestly: ${res.status} ${JSON.stringify(data)}`);
}
console.log(`status=${res.status} supported=${data.supported}`);
NODE
)"
    dashboard_control_code=$?
    set -e
    if [ "$dashboard_control_code" -eq 0 ]; then
      record "dashboard pipeline control proxy" PASS "$(echo "$dashboard_control_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "dashboard pipeline control proxy" FAIL "exit $dashboard_control_code: $(echo "$dashboard_control_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  else
    record "dashboard pipeline control proxy" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify Dashboard control proxy"
  fi

  set +e
  dashboard_yaml_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const id = 'e2e-dashboard-yaml-proxy';
const yaml = `
id: ${id}
name: E2E Dashboard YAML Proxy
version: "0.0.1"
surfaces:
  - id: discovery
    name: Discovery
    agent: dev-pm
    workflow:
      goal: Validate Dashboard YAML proxy.
edges: []
`;
const res = await fetch(`${base}/api/pipelines/load-yaml`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ yaml, source: 'dashboard:e2e-delivery-gate' }),
});
const data = await res.json();
if (res.status !== 201 || data.pipeline?.id !== id) {
  throw new Error(`dashboard yaml proxy failed: ${res.status} ${JSON.stringify(data)}`);
}
console.log(`id=${id}`);
NODE
)"
  dashboard_yaml_code=$?
  set -e
  if [ "$dashboard_yaml_code" -eq 0 ]; then
    record "dashboard yaml pipeline proxy" PASS "$(echo "$dashboard_yaml_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "dashboard yaml pipeline proxy" FAIL "exit $dashboard_yaml_code: $(echo "$dashboard_yaml_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
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
    "options": {
        "dryRun": True,
        "surfaceTimeoutMs": int(os.environ.get("E2E_LIVE_SURFACE_TIMEOUT_MS", "90000")),
    },
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
