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
CODEX_NODE_BIN="${CODEX_NODE_BIN:-$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin}"

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

repo_status_snapshot() {
  local report_rel="${REPORT_FILE#$ROOT/}"

  git -C "$ROOT" status --porcelain=v1 --untracked-files=all \
    | awk -v report="$report_rel" 'substr($0, 4) != report { print }' \
    | sort
}

repo_status_count() {
  printf '%s\n' "$1" | sed '/^$/d' | wc -l | tr -d ' '
}

record_repo_status_result() {
  local before="$1"
  local after="$2"

  if [ "$after" = "$before" ]; then
    record "dry-run repository side effects" PASS "git status unchanged; git status entries=$(repo_status_count "$after")"
  else
    local diff_output
    set +e
    diff_output="$(diff -u <(printf '%s\n' "$before") <(printf '%s\n' "$after") 2>&1 | tail -n 8 | tr '\n' ' ' | sed 's/|/\\|/g')"
    set -e
    record "dry-run repository side effects" FAIL "$diff_output"
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

quit_screen_sessions() {
  local session="$1"
  screen -ls 2>/dev/null \
    | awk -v name="\\.${session}[[:space:]]" '$0 ~ name { print $1 }' \
    | while read -r screen_id; do
      [ -n "$screen_id" ] && screen -S "$screen_id" -X quit >/dev/null 2>&1 || true
    done
}

write_report_header

echo "E2E Delivery Gate"
echo "================="

cd "$ROOT"

run_cmd "local startup scripts syntax" bash -n dev-agent scripts/start-all.sh scripts/start-gateway.sh
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

  if curl -fsS "$GATEWAY_URL/agent-health" >/tmp/dev-agent-agent-health.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
agents = data.get("agents", [])
ok = (
    isinstance(agents, list)
    and len(agents) >= 6
    and all(isinstance(a.get("online"), bool) for a in agents)
    and isinstance(data.get("livePipelineReady"), bool)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-agent-health.json
    then
      agent_health_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("online={}/{} liveReady={}".format(data.get("onlineCount"), data.get("totalAgents"), data.get("livePipelineReady")))' /tmp/dev-agent-agent-health.json)"
      record "gateway agent health" PASS "$agent_health_summary"
    else
      record "gateway agent health" FAIL "GET /agent-health returned an invalid payload"
    fi
  else
    record "gateway agent health" FAIL "GET /agent-health failed"
  fi

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
if (loaded.pipeline?.source !== 'runtime-yaml' || loaded.pipeline?.deletable !== true) {
  throw new Error(`inline loaded pipeline missing runtime metadata: ${JSON.stringify(loaded.pipeline)}`);
}
if (!loaded.pipelines?.some((pipeline) => pipeline.id === id && pipeline.source === 'runtime-yaml' && pipeline.deletable === true)) {
  throw new Error(`inline load response did not return full pipeline definitions: ${JSON.stringify(loaded.pipelines)}`);
}
const listRes = await fetch(`${base}/pipelines`);
const listed = await listRes.json();
if (!listed.pipelines?.some((pipeline) => pipeline.id === id && pipeline.source === 'runtime-yaml' && pipeline.deletable === true)) {
  throw new Error(`inline loaded pipeline not listed: ${id}`);
}
const templateRes = await fetch(`${base}/v1/templates`);
const templateData = await templateRes.json();
if (!templateData.templates?.some((template) => template.id === id && template.source === 'runtime-yaml' && template.deletable === true)) {
  throw new Error(`inline loaded pipeline not exposed as workflow template: ${id}`);
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

  if curl -fsS "$GATEWAY_URL/v1/workflows?status=failed&limit=3" >/tmp/dev-agent-workflows-filtered.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
workflows = data.get("workflows", [])
filters = data.get("filters", {})
ok = (
    isinstance(workflows, list)
    and len(workflows) <= 3
    and filters.get("status") == "failed"
    and int(filters.get("limit") or 0) == 3
    and all(workflow.get("status") == "failed" for workflow in workflows)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-workflows-filtered.json
    then
      workflow_filter_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("status=failed limit=3 returned={}".format(len(data.get("workflows", []))))' /tmp/dev-agent-workflows-filtered.json)"
      record "gateway workflow filters" PASS "$workflow_filter_summary"
    else
      record "gateway workflow filters" FAIL "filtered workflow response was invalid"
    fi
  else
    record "gateway workflow filters" FAIL "GET /v1/workflows?status=failed&limit=3 failed"
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

  if curl -fsS "$GATEWAY_URL/pipeline-instances?status=failed&limit=3" >/tmp/dev-agent-pipeline-instances-filtered.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
filters = data.get("filters", {})
ok = (
    isinstance(instances, list)
    and len(instances) <= 3
    and filters.get("status") == "failed"
    and int(filters.get("limit") or 0) == 3
    and all(instance.get("status") == "failed" for instance in instances)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-pipeline-instances-filtered.json
    then
      filtered_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
print("status=failed limit=3 returned={}".format(len(instances)))' /tmp/dev-agent-pipeline-instances-filtered.json)"
      record "gateway pipeline instance filters" PASS "$filtered_summary"
    else
      record "gateway pipeline instance filters" FAIL "filtered instance response was invalid"
    fi
  else
    record "gateway pipeline instance filters" FAIL "GET /pipeline-instances?status=failed&limit=3 failed"
  fi

  if [ "${RUN_PIPELINE_CONTROL_SMOKE:-0}" = "1" ]; then
    repo_status_before_control="$(repo_status_snapshot)"
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
if (
  started.pipeline_url !== `/pipeline?instanceId=${encodeURIComponent(started.instanceId)}` ||
  started.knowledge_url !== `/knowledge?projectId=${encodeURIComponent(started.coordination.projectId)}` ||
  started.kanban_url !== '/kanban?source=coordination'
) {
  throw new Error(`start response missing navigation links: ${JSON.stringify({
    instanceId: started.instanceId,
    pipelineUrl: started.pipeline_url,
    knowledgeUrl: started.knowledge_url,
    kanbanUrl: started.kanban_url,
  })}`);
}

await new Promise((resolve) => setTimeout(resolve, 300));
const runningRes = await fetch(`${base}/pipeline-instances/${started.instanceId}`);
const runningInstance = await runningRes.json();
const runningSurfaces = Object.values(runningInstance.surfaceResults || {})
  .filter((result) => result?.status === 'running')
  .map((result) => result.surfaceId);
if (!runningRes.ok || runningSurfaces.length < 1) {
  throw new Error(`running surface progress was not observable: ${runningRes.status} ${JSON.stringify({
    statuses: Object.fromEntries(Object.entries(runningInstance.surfaceResults || {}).map(([key, result]) => [key, result?.status])),
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
if (
  cancelled.pipeline_url !== `/pipeline?instanceId=${encodeURIComponent(started.instanceId)}` ||
  cancelled.knowledge_url !== `/knowledge?projectId=${encodeURIComponent(started.coordination.projectId)}` ||
  cancelled.kanban_url !== '/kanban?source=coordination'
) {
  throw new Error(`cancel response missing navigation links: ${JSON.stringify({
    instanceId: cancelled.id,
    pipelineUrl: cancelled.pipeline_url,
    knowledgeUrl: cancelled.knowledge_url,
    kanbanUrl: cancelled.kanban_url,
  })}`);
}
const repeatCancelRes = await fetch(`${base}/pipeline-instances/${started.instanceId}/cancel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: 'E2E repeat cancel idempotency check' }),
});
const repeatCancelled = await repeatCancelRes.json();
if (
  repeatCancelRes.status !== 200 ||
  repeatCancelled.status !== 'cancelled' ||
  repeatCancelled.id !== started.instanceId ||
  repeatCancelled.pipeline_url !== cancelled.pipeline_url ||
  repeatCancelled.knowledge_url !== cancelled.knowledge_url ||
  repeatCancelled.kanban_url !== cancelled.kanban_url
) {
  throw new Error(`repeat cancel was not idempotent: ${repeatCancelRes.status} ${JSON.stringify({
    status: repeatCancelled.status,
    id: repeatCancelled.id,
    pipelineUrl: repeatCancelled.pipeline_url,
    knowledgeUrl: repeatCancelled.knowledge_url,
    kanbanUrl: repeatCancelled.kanban_url,
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
const filteredDocsRes = await fetch(`${base}/api/v2/documents?projectId=${encodeURIComponent(started.coordination.projectId)}&taskId=${encodeURIComponent(retroBinding.taskId)}&limit=50`);
const filteredDocs = await filteredDocsRes.json();
if (!filteredDocsRes.ok || !filteredDocs.documents?.some((doc) => doc.id === experienceDocId)) {
  throw new Error(`document context filter did not return experience doc: ${JSON.stringify({
    status: filteredDocsRes.status,
    projectId: started.coordination.projectId,
    taskId: retroBinding.taskId,
    experienceDocId,
    docs: (filteredDocs.documents || []).map((doc) => doc.id),
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

console.log(`instance=${started.instanceId} project=${started.coordination.projectId} startTasks=${startTaskCount} runningSurfaces=${runningSurfaces.join(',')} tasks=${taskCount} blocked=${blockedCount} experience=${experienceDocId} contextDocs=${filteredDocs.documents.length} repeatCancel=1 unsupportedControls=3`);
NODE
)"
    control_code=$?
    set -e
    if [ "$control_code" -eq 0 ]; then
      record "pipeline control smoke" PASS "$(echo "$control_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "pipeline control smoke" FAIL "exit $control_code: $(echo "$control_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi

    set +e
    timeout_output="$(GATEWAY_URL="$GATEWAY_URL" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const payload = {
  pipelineId: 'dev-team-minimum-loop',
  initialInput: {
    userRequest: 'E2E timeout smoke: force a very short surface timeout. Dry-run only; do not write files.',
    requestedBy: 'e2e-delivery-gate-timeout',
  },
  options: { dryRun: true, surfaceTimeoutMs: 1 },
};
const res = await fetch(`${base}/v1/pipeline/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const data = await res.json();
const surfaceResults = data.surfaceResults || {};
const failedSurfaces = Object.values(surfaceResults).filter((result) => result?.status === 'failed');
const errorText = [
  data.error,
  ...failedSurfaces.map((result) => result?.error || ''),
].join(' ');
if (
  res.status !== 200 ||
  data.status !== 'failed' ||
  failedSurfaces.length < 1 ||
  !/timed out|timeout|aborted|cancelled/i.test(errorText)
) {
  throw new Error(`timeout did not fail the pipeline correctly: ${res.status} ${JSON.stringify({
    status: data.status,
    error: data.error,
    surfaceStatuses: Object.fromEntries(Object.entries(surfaceResults).map(([key, result]) => [key, result?.status])),
    errorText,
  })}`);
}
if (
  data.pipeline_url !== `/pipeline?instanceId=${encodeURIComponent(data.instanceId)}` ||
  !data.knowledge_url ||
  data.kanban_url !== '/kanban?source=coordination'
) {
  throw new Error(`execute response missing navigation links: ${JSON.stringify({
    instanceId: data.instanceId,
    pipelineUrl: data.pipeline_url,
    knowledgeUrl: data.knowledge_url,
    kanbanUrl: data.kanban_url,
  })}`);
}

const coordinationRes = await fetch(`${base}/pipeline-instances/${data.instanceId}/coordination`);
const coordination = await coordinationRes.json();
const statuses = coordination.bindings?.map((binding) => binding.task?.status) || [];
const blockedCount = statuses.filter((status) => status === 'blocked').length;
const experienceDocId = coordination.instance?.coordination?.documentIdsBySurface?._experience;
const retroBinding = coordination.bindings?.find((binding) => binding.surfaceId === 'retrospective');
const retroDocIds = (retroBinding?.documents || []).map((doc) => doc.id);
if (
  !coordinationRes.ok ||
  blockedCount !== statuses.length ||
  !experienceDocId ||
  !retroDocIds.includes(experienceDocId)
) {
  throw new Error(`timeout coordination was not closed correctly: ${coordinationRes.status} ${JSON.stringify({
    statuses,
    blockedCount,
    experienceDocId,
    retroDocIds,
  })}`);
}

const terminalCancelRes = await fetch(`${base}/pipeline-instances/${data.instanceId}/cancel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: 'E2E terminal cancel guard' }),
});
const terminalCancel = await terminalCancelRes.json();
if (
  terminalCancelRes.status !== 409 ||
  terminalCancel.supported !== false ||
  !/cannot be cancelled/i.test(terminalCancel.error || '')
) {
  throw new Error(`terminal pipeline cancel should be rejected: ${terminalCancelRes.status} ${JSON.stringify(terminalCancel)}`);
}

const afterCancelRes = await fetch(`${base}/pipeline-instances/${data.instanceId}`);
const afterCancel = await afterCancelRes.json();
if (!afterCancelRes.ok || afterCancel.status !== 'failed') {
  throw new Error(`terminal cancel mutated failed pipeline status: ${afterCancelRes.status} ${JSON.stringify({
    status: afterCancel.status,
    error: afterCancel.error,
  })}`);
}

console.log(`instance=${data.instanceId} failedSurfaces=${failedSurfaces.map((result) => result.surfaceId).join(',')} blocked=${blockedCount}/${statuses.length} experience=${experienceDocId} terminalCancel=409`);
NODE
)"
    timeout_code=$?
    set -e
    if [ "$timeout_code" -eq 0 ]; then
      record "pipeline timeout smoke" PASS "$(echo "$timeout_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "pipeline timeout smoke" FAIL "exit $timeout_code: $(echo "$timeout_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi

    repo_status_after_control="$(repo_status_snapshot)"
    record_repo_status_result "$repo_status_before_control" "$repo_status_after_control"
  else
    record "pipeline control smoke" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify start/cancel/coordination binding"
    record "pipeline timeout smoke" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify timeout failure handling"
    record "dry-run repository side effects" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to compare git status around dry-run execution"
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

      quit_screen_sessions dev-agent-gateway
      lsof -tiTCP:8400 -sTCP:LISTEN 2>/dev/null | xargs kill -9 >/dev/null 2>&1 || true
      pkill -f "$ROOT/packages/gateway.*pnpm dev" >/dev/null 2>&1 || true
      pkill -f "$ROOT/packages/gateway.*tsx" >/dev/null 2>&1 || true
      sleep 2
      screen -dmS dev-agent-gateway bash -lc "cd '$ROOT/packages/gateway' && env PATH='$CODEX_NODE_BIN':\$PATH GATEWAY_PORT=8400 ./node_modules/.bin/tsx src/api-gateway.ts 2>&1 | tee -a ../../.codex-run/logs/gateway-screen.log"
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
const deleteRes = await fetch(`${base}/pipelines/e2e-inline-yaml-persistent`, { method: 'DELETE' });
const deleted = await deleteRes.json();
if (deleteRes.status !== 200 || deleted.deleted !== true) {
  throw new Error(`persistent inline YAML pipeline was not deleted: ${deleteRes.status} ${JSON.stringify(deleted)}`);
}
const afterDeleteRes = await fetch(`${base}/pipelines`);
const afterDelete = await afterDeleteRes.json();
if (afterDelete.pipelines?.some((pipeline) => pipeline.id === 'e2e-inline-yaml-persistent')) {
  throw new Error('deleted inline YAML pipeline is still listed');
}
console.log(`instance=${instanceId} project=${summary.instance?.coordination?.projectId || 'none'} tasks=${taskCount} blocked=${blockedCount} experience=${experienceDocId} yamlRestored=1 yamlDeleted=1`);
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

  if curl -fsS "$DASHBOARD_URL/api/health" >/tmp/dev-agent-dashboard-health.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
agents = data.get("agents", [])
ok = (
    isinstance(data.get("gatewayOnline"), bool)
    and isinstance(data.get("livePipelineReady"), bool)
    and isinstance(agents, list)
    and len(agents) >= 6
    and all(isinstance(a.get("online"), bool) for a in agents)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-health.json
    then
      dashboard_health_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("online={}/{} gateway={} liveReady={}".format(data.get("onlineCount"), data.get("totalAgents"), data.get("gatewayOnline"), data.get("livePipelineReady")))' /tmp/dev-agent-dashboard-health.json)"
      record "dashboard agent health" PASS "$dashboard_health_summary"
    else
      record "dashboard agent health" FAIL "GET /api/health returned an invalid payload"
    fi
  else
    record "dashboard agent health" FAIL "GET /api/health failed"
  fi

  if curl -fsS "$GATEWAY_URL/agent-health" >/dev/null 2>&1 && curl -fsS "$DASHBOARD_URL/api/health" >/dev/null 2>&1; then
    run_cmd "dev-agent doctor" ./dev-agent doctor
    if ./dev-agent doctor --json >/tmp/dev-agent-doctor.json 2>/tmp/dev-agent-doctor.err; then
      if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
ok = (
    data.get("ok") is True
    and data.get("agentHealth", {}).get("onlineCount") == 6
    and data.get("agentHealth", {}).get("totalAgents") == 6
    and data.get("agentHealth", {}).get("livePipelineReady") is True
    and data.get("gateway", {}).get("ok") is True
    and data.get("dashboard", {}).get("ok") is True
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-doctor.json
      then
        doctor_json_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
agent = data.get("agentHealth", {})
print("online={}/{} liveReady={}".format(agent.get("onlineCount"), agent.get("totalAgents"), agent.get("livePipelineReady")))' /tmp/dev-agent-doctor.json)"
        record "dev-agent doctor json" PASS "$doctor_json_summary"
      else
        record "dev-agent doctor json" FAIL "JSON payload did not report ready state"
      fi
    else
      record "dev-agent doctor json" FAIL "$(tail -n 3 /tmp/dev-agent-doctor.err | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  else
    record "dev-agent doctor" WARN "skipped; Gateway or Dashboard readiness endpoint is unavailable"
    record "dev-agent doctor json" WARN "skipped; Gateway or Dashboard readiness endpoint is unavailable"
  fi

  if curl -fsS "$DASHBOARD_URL/api/readiness" >/tmp/dev-agent-dashboard-readiness.json 2>/tmp/dev-agent-dashboard-readiness.err; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
agent = data.get("agentHealth", {})
ok = (
    data.get("ok") is True
    and data.get("source") == "./dev-agent doctor --json"
    and agent.get("onlineCount") == 6
    and agent.get("totalAgents") == 6
    and agent.get("livePipelineReady") is True
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-readiness.json
    then
      readiness_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
agent = data.get("agentHealth", {})
print("online={}/{} liveReady={}".format(agent.get("onlineCount"), agent.get("totalAgents"), agent.get("livePipelineReady")))' /tmp/dev-agent-dashboard-readiness.json)"
      record "dashboard readiness endpoint" PASS "$readiness_summary"
    else
      record "dashboard readiness endpoint" FAIL "payload did not report ready state"
    fi
  else
    record "dashboard readiness endpoint" FAIL "$(tail -n 3 /tmp/dev-agent-dashboard-readiness.err | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsS "$DASHBOARD_URL/api/delivery-gate/latest" >/tmp/dev-agent-dashboard-delivery-gate.json 2>/tmp/dev-agent-dashboard-delivery-gate.err; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
ok = (
    isinstance(data.get("ok"), bool)
    and isinstance(data.get("pass"), int)
    and isinstance(data.get("fail"), int)
    and isinstance(data.get("warn"), int)
    and data.get("pass", 0) + data.get("fail", 0) + data.get("warn", 0) > 0
    and isinstance(data.get("summary"), str)
    and isinstance(data.get("report"), str)
    and data.get("report", "").startswith("e2e-delivery-gate-")
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-delivery-gate.json
    then
      delivery_gate_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("{} {}".format(data.get("report"), data.get("summary")))' /tmp/dev-agent-dashboard-delivery-gate.json)"
      record "dashboard delivery gate endpoint" PASS "$delivery_gate_summary"
    else
      record "dashboard delivery gate endpoint" FAIL "payload did not report a completed latest gate"
    fi
  else
    record "dashboard delivery gate endpoint" FAIL "$(tail -n 3 /tmp/dev-agent-dashboard-delivery-gate.err | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsSI "$DASHBOARD_URL/api/delivery-gate/latest?format=markdown" >/tmp/dev-agent-dashboard-delivery-gate-headers.txt 2>/tmp/dev-agent-dashboard-delivery-gate-md.err \
    && curl -fsS "$DASHBOARD_URL/api/delivery-gate/latest?format=markdown" >/tmp/dev-agent-dashboard-delivery-gate.md 2>>/tmp/dev-agent-dashboard-delivery-gate-md.err; then
    if rg -q '^content-type: text/markdown' /tmp/dev-agent-dashboard-delivery-gate-headers.txt \
      && rg -q '^x-delivery-gate-report: e2e-delivery-gate-' /tmp/dev-agent-dashboard-delivery-gate-headers.txt \
      && rg -q '^## Summary$' /tmp/dev-agent-dashboard-delivery-gate.md \
      && rg -q '^- PASS: [1-9][0-9]*$' /tmp/dev-agent-dashboard-delivery-gate.md; then
      report_name="$(awk -F': ' 'tolower($1)=="x-delivery-gate-report" {print $2}' /tmp/dev-agent-dashboard-delivery-gate-headers.txt | tr -d '\r' | tail -n 1)"
      record "dashboard delivery gate markdown" PASS "$report_name"
    else
      record "dashboard delivery gate markdown" FAIL "markdown response missing report headers or summary"
    fi
  else
    record "dashboard delivery gate markdown" FAIL "$(tail -n 3 /tmp/dev-agent-dashboard-delivery-gate-md.err | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsS "$DASHBOARD_URL/api/delivery-gate/history?limit=5" >/tmp/dev-agent-dashboard-delivery-gate-history.json 2>/tmp/dev-agent-dashboard-delivery-gate-history.err; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
reports = data.get("reports")
reports = reports if isinstance(reports, list) else []
latest = reports[0] if reports else {}
ok = (
    data.get("ok") is True
    and isinstance(data.get("count"), int)
    and data.get("count", 0) == len(reports)
    and data.get("latestOk") == latest.get("ok")
    and isinstance(latest.get("report"), str)
    and latest.get("report", "").startswith("e2e-delivery-gate-")
    and isinstance(latest.get("summary"), str)
    and isinstance(latest.get("total"), int)
    and latest.get("total", 0) > 0
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-delivery-gate-history.json
    then
      delivery_gate_history_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
latest = data.get("reports", [{}])[0]
print("count={} latest={} {}".format(data.get("count"), latest.get("report"), latest.get("summary")))' /tmp/dev-agent-dashboard-delivery-gate-history.json)"
      record "dashboard delivery gate history" PASS "$delivery_gate_history_summary"
    else
      record "dashboard delivery gate history" FAIL "payload did not report completed gate history"
    fi
  else
    record "dashboard delivery gate history" FAIL "$(tail -n 3 /tmp/dev-agent-dashboard-delivery-gate-history.err | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsS "$DASHBOARD_URL/api/team-loop/status" >/tmp/dev-agent-dashboard-team-loop.json 2>/tmp/dev-agent-dashboard-team-loop.err; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
latest = data.get("latestInstance") or {}
kanban = data.get("kanban") or {}
documents = data.get("documents") or {}
gate = data.get("deliveryGate") or {}
checks = data.get("checks") or {}
missing = data.get("missing")
ok = (
    data.get("ok") is True
    and gate.get("ok") is True
    and isinstance(checks, dict)
    and len(checks) >= 7
    and all(value is True for value in checks.values())
    and missing == []
    and data.get("checkSummary") == "{}/{}".format(len(checks), len(checks))
    and isinstance(latest.get("id"), str)
    and latest.get("id", "").startswith("pipeline-")
    and isinstance(latest.get("projectId"), str)
    and latest.get("surfaceTaskCount", 0) > 0
    and latest.get("surfaceDocumentCount", 0) > 0
    and kanban.get("taskCount", 0) >= latest.get("surfaceTaskCount", 0)
    and documents.get("boundProjectDocumentCount", 0) > 0
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-team-loop.json
    then
      team_loop_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
latest = data.get("latestInstance") or {}
kanban = data.get("kanban") or {}
documents = data.get("documents") or {}
print("instance={} project={} checks={} tasks={}/{} docs={}/{}".format(
    latest.get("id"),
    latest.get("projectId"),
    data.get("checkSummary"),
    kanban.get("taskCount"),
    latest.get("surfaceTaskCount"),
    documents.get("boundProjectDocumentCount"),
    documents.get("projectDocumentCount"),
))' /tmp/dev-agent-dashboard-team-loop.json)"
      record "dashboard team loop status" PASS "$team_loop_summary"
    else
      record "dashboard team loop status" FAIL "payload did not report a linked Team Coordination Loop"
    fi
  else
    record "dashboard team loop status" FAIL "$(tail -n 3 /tmp/dev-agent-dashboard-team-loop.err | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

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
workflows = data.get("workflows", [])
ok = (
    isinstance(workflows, list)
    and any(
        workflow.get("pipeline_instance_id")
        and workflow.get("project_id")
        and int(workflow.get("coordination_task_count") or 0) > 0
        for workflow in workflows
    )
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-workflows.json
    then
      workflow_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
workflows = data.get("workflows", [])
bound = [w for w in workflows if w.get("pipeline_instance_id") and w.get("project_id")]
latest = bound[0] if bound else {}
print("workflows={} bound={} latest={} project={} tasks={}".format(len(workflows), len(bound), latest.get("pipeline_instance_id", "none"), latest.get("project_id", "none"), latest.get("coordination_task_count", 0)))' /tmp/dev-agent-dashboard-workflows.json)"
      record "dashboard workflow proxy" PASS "$workflow_summary"
    else
      record "dashboard workflow proxy" FAIL "GET /api/workflows returned no Pipeline workflow binding"
    fi
  else
    record "dashboard workflow proxy" FAIL "GET /api/workflows failed"
  fi

  set +e
  dashboard_workflow_links_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const res = await fetch(`${base}/api/workflows?limit=10`, { cache: 'no-store' });
const data = await res.json();
if (!res.ok || !Array.isArray(data.workflows)) {
  throw new Error(`workflow list failed: ${res.status} ${JSON.stringify(data)}`);
}
const workflow = data.workflows.find((item) =>
  item.pipeline_instance_id &&
  item.project_id &&
  item.pipeline_url &&
  item.knowledge_url &&
  item.kanban_url
);
if (!workflow) {
  throw new Error(`workflow missing navigation links: ${JSON.stringify(data.workflows.slice(0, 3))}`);
}
const pipelineUrl = new URL(workflow.pipeline_url, base);
if (pipelineUrl.pathname !== '/pipeline' || pipelineUrl.searchParams.get('instanceId') !== workflow.pipeline_instance_id) {
  throw new Error(`workflow pipeline link is not instance-scoped: ${JSON.stringify(workflow)}`);
}
const instanceRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(workflow.pipeline_instance_id)}`);
const instance = await instanceRes.json();
if (!instanceRes.ok || instance.id !== workflow.pipeline_instance_id) {
  throw new Error(`workflow pipeline link did not resolve: ${instanceRes.status} ${JSON.stringify(instance)}`);
}
const knowledgeUrl = new URL(workflow.knowledge_url, base);
if (knowledgeUrl.pathname !== '/knowledge' || knowledgeUrl.searchParams.get('projectId') !== workflow.project_id) {
  throw new Error(`workflow knowledge link is not project-scoped: ${JSON.stringify(workflow)}`);
}
const docsRes = await fetch(`${base}/api/v2/documents?${knowledgeUrl.searchParams.toString()}&limit=50`);
const docs = await docsRes.json();
if (!docsRes.ok || !docs.documents?.some((doc) => doc.projectId === workflow.project_id)) {
  throw new Error(`workflow knowledge link did not resolve documents: ${docsRes.status} ${JSON.stringify({
    workflowId: workflow.id,
    projectId: workflow.project_id,
    documents: (docs.documents || []).map((doc) => ({ id: doc.id, projectId: doc.projectId })),
  })}`);
}
const kanbanUrl = new URL(workflow.kanban_url, base);
if (kanbanUrl.pathname !== '/kanban' || kanbanUrl.searchParams.get('source') !== 'coordination') {
  throw new Error(`workflow kanban link is not coordination-scoped: ${JSON.stringify(workflow)}`);
}
const kanbanRes = await fetch(`${base}/api/kanban?${kanbanUrl.searchParams.toString()}`, { cache: 'no-store' });
const kanban = await kanbanRes.json();
if (!kanbanRes.ok || !kanban.tasks?.some((task) => task.project_id === workflow.project_id)) {
  throw new Error(`workflow kanban link did not resolve project tasks: ${kanbanRes.status} ${JSON.stringify({
    workflowId: workflow.id,
    projectId: workflow.project_id,
    taskCount: kanban.tasks?.length,
  })}`);
}
console.log(`workflow=${workflow.id} project=${workflow.project_id} docs=${docs.documents.length} tasks=${kanban.tasks.length}`);
NODE
)"
  dashboard_workflow_links_code=$?
  set -e
  if [ "$dashboard_workflow_links_code" -eq 0 ]; then
    record "dashboard workflow navigation links" PASS "$(echo "$dashboard_workflow_links_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "dashboard workflow navigation links" FAIL "exit $dashboard_workflow_links_code: $(echo "$dashboard_workflow_links_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsS "$DASHBOARD_URL/api/workflows?status=failed&limit=3" >/tmp/dev-agent-dashboard-workflows-filtered.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
workflows = data.get("workflows", [])
filters = data.get("filters", {})
ok = (
    isinstance(workflows, list)
    and len(workflows) <= 3
    and filters.get("status") == "failed"
    and int(filters.get("limit") or 0) == 3
    and all(workflow.get("status") == "failed" for workflow in workflows)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-workflows-filtered.json
    then
      dashboard_workflow_filter_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
print("status=failed limit=3 returned={}".format(len(data.get("workflows", []))))' /tmp/dev-agent-dashboard-workflows-filtered.json)"
      record "dashboard workflow filters" PASS "$dashboard_workflow_filter_summary"
    else
      record "dashboard workflow filters" FAIL "filtered Dashboard workflow response was invalid"
    fi
  else
    record "dashboard workflow filters" FAIL "GET /api/workflows?status=failed&limit=3 failed"
  fi

  if curl -fsS "$DASHBOARD_URL/api/pipeline-instances" >/tmp/dev-agent-dashboard-pipeline-instances.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
ok = (
    isinstance(instances, list)
    and any(
        isinstance(instance.get("surfaceResults"), dict)
        and instance.get("coordination", {}).get("projectId")
        and instance.get("pipeline_url")
        and instance.get("knowledge_url")
        and instance.get("kanban_url")
        for instance in instances
    )
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-pipeline-instances.json
    then
      dashboard_instance_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
bound = [i for i in instances if isinstance(i.get("surfaceResults"), dict) and i.get("coordination", {}).get("projectId")]
latest = bound[0] if bound else {}
nav = sum(1 for i in bound if i.get("pipeline_url") and i.get("knowledge_url") and i.get("kanban_url"))
print("instances={} bound={} nav={} latest={} status={}".format(len(instances), len(bound), nav, latest.get("id", "none"), latest.get("status", "unknown")))' /tmp/dev-agent-dashboard-pipeline-instances.json)"
      record "dashboard pipeline instances proxy" PASS "$dashboard_instance_summary"
    else
      record "dashboard pipeline instances proxy" FAIL "GET /api/pipeline-instances returned no bound Pipeline instances"
    fi
  else
    record "dashboard pipeline instances proxy" FAIL "GET /api/pipeline-instances failed"
  fi

  set +e
  dashboard_pipeline_coordination_links_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const instancesRes = await fetch(`${base}/api/pipeline-instances?limit=10`, { cache: 'no-store' });
const instancesPayload = await instancesRes.json();
if (!instancesRes.ok || !Array.isArray(instancesPayload.instances)) {
  throw new Error(`pipeline instance list failed: ${instancesRes.status} ${JSON.stringify(instancesPayload)}`);
}
const instance = instancesPayload.instances.find((item) => item.coordination?.projectId);
if (!instance) {
  throw new Error(`no coordinated pipeline instance found: ${JSON.stringify(instancesPayload.instances.slice(0, 3))}`);
}
const summaryRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(instance.id)}/coordination`);
const summary = await summaryRes.json();
if (!summaryRes.ok || summary.instance?.id !== instance.id || !summary.project?.id) {
  throw new Error(`pipeline coordination summary failed: ${summaryRes.status} ${JSON.stringify(summary)}`);
}
const navigation = summary.navigation || {};
const projectId = summary.project.id;
const pipelineUrl = new URL(navigation.pipeline_url || '', base);
const knowledgeUrl = new URL(navigation.knowledge_url || '', base);
const kanbanUrl = new URL(navigation.kanban_url || '', base);
if (
  pipelineUrl.pathname !== '/pipeline' ||
  pipelineUrl.searchParams.get('instanceId') !== instance.id ||
  knowledgeUrl.pathname !== '/knowledge' ||
  knowledgeUrl.searchParams.get('projectId') !== projectId ||
  kanbanUrl.pathname !== '/kanban' ||
  kanbanUrl.searchParams.get('source') !== 'coordination'
) {
  throw new Error(`pipeline coordination navigation is invalid: ${JSON.stringify({ navigation, projectId, instanceId: instance.id })}`);
}
const binding = (summary.bindings || []).find((item) =>
  item.taskId &&
  item.knowledge_url &&
  (item.documents || []).some((doc) => doc.taskId === item.taskId && doc.projectId === projectId)
);
if (!binding) {
  throw new Error(`pipeline coordination binding missing resolvable knowledge link: ${JSON.stringify((summary.bindings || []).slice(0, 3))}`);
}
const bindingKnowledgeUrl = new URL(binding.knowledge_url, base);
if (
  bindingKnowledgeUrl.pathname !== '/knowledge' ||
  bindingKnowledgeUrl.searchParams.get('projectId') !== projectId ||
  bindingKnowledgeUrl.searchParams.get('taskId') !== binding.taskId
) {
  throw new Error(`pipeline coordination binding link is not task-scoped: ${JSON.stringify(binding)}`);
}
const docsRes = await fetch(`${base}/api/v2/documents?${bindingKnowledgeUrl.searchParams.toString()}&limit=50`);
const docs = await docsRes.json();
if (!docsRes.ok || !docs.documents?.some((doc) => doc.taskId === binding.taskId && doc.projectId === projectId)) {
  throw new Error(`pipeline coordination binding link did not resolve documents: ${docsRes.status} ${JSON.stringify({
    binding,
    documents: (docs.documents || []).map((doc) => ({ id: doc.id, projectId: doc.projectId, taskId: doc.taskId })),
  })}`);
}
console.log(`instance=${instance.id} project=${projectId} bindings=${summary.bindings.length} linkedSurface=${binding.surfaceId} docs=${docs.documents.length}`);
NODE
)"
  dashboard_pipeline_coordination_links_code=$?
  set -e
  if [ "$dashboard_pipeline_coordination_links_code" -eq 0 ]; then
    record "dashboard pipeline coordination links" PASS "$(echo "$dashboard_pipeline_coordination_links_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "dashboard pipeline coordination links" FAIL "exit $dashboard_pipeline_coordination_links_code: $(echo "$dashboard_pipeline_coordination_links_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  if curl -fsS "$DASHBOARD_URL/api/pipeline-instances?status=failed&limit=3" >/tmp/dev-agent-dashboard-pipeline-instances-filtered.json 2>/dev/null; then
    if python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
filters = data.get("filters", {})
ok = (
    isinstance(instances, list)
    and len(instances) <= 3
    and filters.get("status") == "failed"
    and int(filters.get("limit") or 0) == 3
    and all(instance.get("status") == "failed" for instance in instances)
)
raise SystemExit(0 if ok else 1)' /tmp/dev-agent-dashboard-pipeline-instances-filtered.json
    then
      dashboard_filtered_summary="$(python3 -c 'import json, sys
with open(sys.argv[1], "r", encoding="utf-8") as f:
    data = json.load(f)
instances = data.get("instances", [])
print("status=failed limit=3 returned={}".format(len(instances)))' /tmp/dev-agent-dashboard-pipeline-instances-filtered.json)"
      record "dashboard pipeline instance filters" PASS "$dashboard_filtered_summary"
    else
      record "dashboard pipeline instance filters" FAIL "filtered Dashboard instance response was invalid"
    fi
  else
    record "dashboard pipeline instance filters" FAIL "GET /api/pipeline-instances?status=failed&limit=3 failed"
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
const payload = {
  pipelineId: 'dev-team-minimum-loop',
  initialInput: {
    userRequest: 'E2E Dashboard control smoke: start through Dashboard API, observe, cancel, and verify coordination bindings. Dry-run only; do not write repository files.',
    requestedBy: 'e2e-dashboard-control-smoke',
  },
  options: { dryRun: true, surfaceTimeoutMs: 1000 },
};
const startRes = await fetch(`${base}/api/pipelines/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const started = await startRes.json();
if (!startRes.ok || !started.instanceId || !started.coordination?.projectId) {
  throw new Error(`dashboard start proxy failed: ${startRes.status} ${JSON.stringify(started)}`);
}
if (
  started.pipeline_url !== `/pipeline?instanceId=${encodeURIComponent(started.instanceId)}` ||
  started.knowledge_url !== `/knowledge?projectId=${encodeURIComponent(started.coordination.projectId)}` ||
  started.kanban_url !== '/kanban?source=coordination'
) {
  throw new Error(`dashboard start response missing navigation links: ${JSON.stringify({
    instanceId: started.instanceId,
    pipelineUrl: started.pipeline_url,
    knowledgeUrl: started.knowledge_url,
    kanbanUrl: started.kanban_url,
  })}`);
}

await new Promise((resolve) => setTimeout(resolve, 300));
const runningRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(started.instanceId)}`, { cache: 'no-store' });
const running = await runningRes.json();
const runningSurfaces = Object.values(running.surfaceResults || {})
  .filter((result) => result?.status === 'running')
  .map((result) => result.surfaceId);
if (!runningRes.ok || runningSurfaces.length < 1) {
  throw new Error(`dashboard instance progress was not observable: ${runningRes.status} ${JSON.stringify({
    statuses: Object.fromEntries(Object.entries(running.surfaceResults || {}).map(([key, result]) => [key, result?.status])),
  })}`);
}

const cancelRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(started.instanceId)}/cancel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: 'E2E Dashboard control smoke cancellation' }),
});
const cancelled = await cancelRes.json();
const taskCount = Object.keys(cancelled.coordination?.taskIdsBySurface || {}).length;
if (cancelRes.status !== 200 || cancelled.status !== 'cancelled' || taskCount < 1) {
  throw new Error(`dashboard cancel proxy failed: ${cancelRes.status} ${JSON.stringify({
    status: cancelled.status,
    taskCount,
    projectId: cancelled.coordination?.projectId,
  })}`);
}
if (
  cancelled.pipeline_url !== `/pipeline?instanceId=${encodeURIComponent(started.instanceId)}` ||
  cancelled.knowledge_url !== `/knowledge?projectId=${encodeURIComponent(started.coordination.projectId)}` ||
  cancelled.kanban_url !== '/kanban?source=coordination'
) {
  throw new Error(`dashboard cancel response missing navigation links: ${JSON.stringify({
    instanceId: cancelled.id,
    pipelineUrl: cancelled.pipeline_url,
    knowledgeUrl: cancelled.knowledge_url,
    kanbanUrl: cancelled.kanban_url,
  })}`);
}

await new Promise((resolve) => setTimeout(resolve, 500));
const coordinationRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(started.instanceId)}/coordination`, { cache: 'no-store' });
const coordination = await coordinationRes.json();
if (!coordinationRes.ok || !Array.isArray(coordination.bindings) || coordination.bindings.length !== taskCount) {
  throw new Error(`dashboard coordination proxy failed after cancel: ${coordinationRes.status} ${JSON.stringify({
    bindings: coordination.bindings?.length,
    taskCount,
  })}`);
}
const blockedCount = coordination.bindings.filter((binding) => binding.task?.status === 'blocked').length;
if (blockedCount !== coordination.bindings.length) {
  throw new Error(`dashboard cancel did not block all coordination tasks: ${JSON.stringify(coordination.bindings.map((binding) => binding.task?.status))}`);
}

const pauseRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(started.instanceId)}/pause`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({}),
});
const pause = await pauseRes.json();
if (pauseRes.ok || pause.supported !== false || !pause.error) {
  throw new Error(`dashboard pause proxy should fail honestly: ${pauseRes.status} ${JSON.stringify(pause)}`);
}

console.log(`instance=${started.instanceId} project=${started.coordination.projectId} runningSurfaces=${runningSurfaces.join(',')} tasks=${taskCount} blocked=${blockedCount} pause=${pauseRes.status}`);
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

  if [ "${RUN_PIPELINE_CONTROL_SMOKE:-0}" = "1" ]; then
    set +e
    dashboard_timeout_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const startRes = await fetch(`${base}/api/pipelines/execute`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    pipelineId: 'dev-team-minimum-loop',
    initialInput: {
      userRequest: 'E2E dashboard timeout forwarding smoke. Dry-run only; do not write files.',
      requestedBy: 'e2e-dashboard-timeout-forwarding',
    },
    options: { dryRun: true, surfaceTimeoutMs: 1 },
  }),
});
const started = await startRes.json();
if (!startRes.ok || !started.instanceId) {
  throw new Error(`dashboard execute did not start: ${startRes.status} ${JSON.stringify(started)}`);
}

let instance = null;
for (let i = 0; i < 20; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const statusRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(started.instanceId)}`);
  instance = await statusRes.json();
  if (!statusRes.ok) {
    throw new Error(`dashboard instance status failed: ${statusRes.status} ${JSON.stringify(instance)}`);
  }
  if (instance.status !== 'running') break;
}

const failedSurfaces = Object.values(instance?.surfaceResults || {}).filter((result) => result?.status === 'failed');
const errorText = [instance?.error, ...failedSurfaces.map((result) => result?.error || '')].join(' ');
if (instance?.status !== 'failed' || failedSurfaces.length < 1 || !/timed out|timeout|aborted/i.test(errorText)) {
  throw new Error(`dashboard timeout option was not forwarded: ${JSON.stringify({
    instanceId: started.instanceId,
    status: instance?.status,
    error: instance?.error,
    failedSurfaces: failedSurfaces.map((result) => result.surfaceId),
    errorText,
  })}`);
}

console.log(`instance=${started.instanceId} failedSurfaces=${failedSurfaces.map((result) => result.surfaceId).join(',')}`);
NODE
)"
    dashboard_timeout_code=$?
    set -e
    if [ "$dashboard_timeout_code" -eq 0 ]; then
      record "dashboard pipeline timeout option" PASS "$(echo "$dashboard_timeout_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "dashboard pipeline timeout option" FAIL "exit $dashboard_timeout_code: $(echo "$dashboard_timeout_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  else
    record "dashboard pipeline timeout option" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify Dashboard timeout forwarding"
  fi

  if [ "${RUN_PIPELINE_CONTROL_SMOKE:-0}" = "1" ]; then
    set +e
    dashboard_kanban_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const res = await fetch(`${base}/api/kanban`, { cache: 'no-store' });
const data = await res.json();
if (!res.ok || !Array.isArray(data.tasks)) {
  throw new Error(`dashboard kanban failed: ${res.status} ${JSON.stringify(data)}`);
}
const task = data.tasks.find((item) =>
  item.source === 'coordination' &&
  item.project_id &&
  Number(item.document_count || 0) > 0 &&
  item.pipeline_instance_id &&
  item.surface_id &&
  item.knowledge_url &&
  item.workflow_url
);
if (!task) {
  throw new Error(`coordination task missing document or workflow links: ${JSON.stringify(data.tasks.slice(0, 5))}`);
}
const knowledgeUrl = new URL(task.knowledge_url, base);
if (
  knowledgeUrl.pathname !== '/knowledge' ||
  knowledgeUrl.searchParams.get('projectId') !== task.project_id ||
  knowledgeUrl.searchParams.get('taskId') !== task.id
) {
  throw new Error(`kanban knowledge link is not task-scoped: ${JSON.stringify({
    taskId: task.id,
    projectId: task.project_id,
    knowledgeUrl: task.knowledge_url,
  })}`);
}
const docsRes = await fetch(`${base}/api/v2/documents?${knowledgeUrl.searchParams.toString()}&limit=50`);
const docs = await docsRes.json();
if (!docsRes.ok || !docs.documents?.some((doc) => doc.taskId === task.id && doc.projectId === task.project_id)) {
  throw new Error(`kanban knowledge link did not resolve documents: ${docsRes.status} ${JSON.stringify({
    taskId: task.id,
    projectId: task.project_id,
    knowledgeUrl: task.knowledge_url,
    documents: (docs.documents || []).map((doc) => ({ id: doc.id, projectId: doc.projectId, taskId: doc.taskId })),
  })}`);
}
const legacyDocsRes = await fetch(`${base}/api/knowledge?${knowledgeUrl.searchParams.toString()}&limit=50`);
const legacyDocs = await legacyDocsRes.json();
if (!legacyDocsRes.ok || !legacyDocs.documents?.some((doc) => doc.taskId === task.id && doc.projectId === task.project_id)) {
  throw new Error(`legacy knowledge proxy dropped task context: ${legacyDocsRes.status} ${JSON.stringify({
    taskId: task.id,
    projectId: task.project_id,
    documents: (legacyDocs.documents || []).map((doc) => ({ id: doc.id, projectId: doc.projectId, taskId: doc.taskId })),
  })}`);
}
const workflowUrl = new URL(task.workflow_url, base);
if (workflowUrl.pathname !== '/pipeline' || workflowUrl.searchParams.get('instanceId') !== task.pipeline_instance_id) {
  throw new Error(`kanban workflow link is not instance-scoped: ${JSON.stringify({
    taskId: task.id,
    pipelineInstanceId: task.pipeline_instance_id,
    workflowUrl: task.workflow_url,
  })}`);
}
const instanceRes = await fetch(`${base}/api/pipeline-instances/${encodeURIComponent(task.pipeline_instance_id)}`);
const instance = await instanceRes.json();
if (!instanceRes.ok || instance.id !== task.pipeline_instance_id || !instance.coordination?.taskIdsBySurface?.[task.surface_id]) {
  throw new Error(`kanban workflow link did not resolve: ${instanceRes.status} ${JSON.stringify({
    task,
    instanceId: instance.id,
    surfaces: Object.keys(instance.coordination?.taskIdsBySurface || {}),
  })}`);
}
console.log(`task=${task.id} project=${task.project_id} documents=${docs.documents.length}/${task.document_count} legacyDocs=${legacyDocs.documents.length} instance=${task.pipeline_instance_id} surface=${task.surface_id}`);
NODE
)"
    dashboard_kanban_code=$?
    set -e
    if [ "$dashboard_kanban_code" -eq 0 ]; then
      record "dashboard kanban document links" PASS "$(echo "$dashboard_kanban_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "dashboard kanban document links" FAIL "exit $dashboard_kanban_code: $(echo "$dashboard_kanban_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  else
    record "dashboard kanban document links" WARN "skipped; set RUN_PIPELINE_CONTROL_SMOKE=1 to verify Kanban document links"
  fi

  set +e
  dashboard_kanban_filter_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const res = await fetch(`${base}/api/kanban?source=coordination`, { cache: 'no-store' });
const data = await res.json();
if (
  !res.ok ||
  data.filters?.source !== 'coordination' ||
  !Array.isArray(data.tasks) ||
  data.tasks.length < 1 ||
  !data.tasks.every((task) => task.source === 'coordination')
) {
  throw new Error(`kanban source filter failed: ${res.status} ${JSON.stringify({
    filters: data.filters,
    taskCount: data.tasks?.length,
    sample: data.tasks?.slice?.(0, 3),
  })}`);
}
const linkedCount = data.tasks.filter((task) => task.pipeline_instance_id && task.pipeline_id && task.surface_id).length;
const recentMissing = data.tasks.slice(0, 20).filter((task) => !task.pipeline_instance_id || !task.pipeline_id || !task.surface_id);
if (linkedCount / data.tasks.length < 0.95 || recentMissing.length > 0) {
  throw new Error(`kanban pipeline links were not preserved: ${JSON.stringify({
    tasks: data.tasks.length,
    linkedCount,
    recentMissing: recentMissing.map((task) => task.id),
  })}`);
}
console.log(`source=${data.filters.source} tasks=${data.tasks.length} linked=${linkedCount}`);
NODE
)"
  dashboard_kanban_filter_code=$?
  set -e
  if [ "$dashboard_kanban_filter_code" -eq 0 ]; then
    record "dashboard kanban filters" PASS "$(echo "$dashboard_kanban_filter_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "dashboard kanban filters" FAIL "exit $dashboard_kanban_filter_code: $(echo "$dashboard_kanban_filter_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
  fi

  set +e
  dashboard_kanban_task_output="$(DASHBOARD_URL="$DASHBOARD_URL" node <<'NODE' 2>&1
const base = process.env.DASHBOARD_URL;
const createRes = await fetch(`${base}/api/kanban/tasks`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'E2E dashboard kanban local task',
    description: 'Created and removed by e2e-delivery-gate',
    assignee: 'dev-frontend',
    priority: 'medium',
    task_type: 'test',
  }),
});
const created = await createRes.json();
if (createRes.status !== 201 || !created.id || created.title !== 'E2E dashboard kanban local task' || created.status !== 'todo') {
  throw new Error(`create local kanban task failed: ${createRes.status} ${JSON.stringify(created)}`);
}

const updateRes = await fetch(`${base}/api/kanban/tasks/${encodeURIComponent(created.id)}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'done', progress: 100 }),
});
const updated = await updateRes.json();
if (updateRes.status !== 200 || updated.id !== created.id || updated.status !== 'done' || Number(updated.progress) !== 100) {
  throw new Error(`update local kanban task failed: ${updateRes.status} ${JSON.stringify(updated)}`);
}

const deleteRes = await fetch(`${base}/api/kanban/tasks/${encodeURIComponent(created.id)}`, { method: 'DELETE' });
const deleted = await deleteRes.json();
if (deleteRes.status !== 200 || deleted.deleted !== created.id) {
  throw new Error(`delete local kanban task failed: ${deleteRes.status} ${JSON.stringify(deleted)}`);
}

const missingRes = await fetch(`${base}/api/kanban/tasks/${encodeURIComponent(created.id)}`);
if (missingRes.status !== 404) {
  const missing = await missingRes.text();
  throw new Error(`deleted local kanban task still resolves: ${missingRes.status} ${missing}`);
}

console.log(`task=${created.id} lifecycle=create-update-delete`);
NODE
)"
  dashboard_kanban_task_code=$?
  set -e
  if [ "$dashboard_kanban_task_code" -eq 0 ]; then
    record "dashboard kanban local task lifecycle" PASS "$(echo "$dashboard_kanban_task_output" | tail -n 1 | sed 's/|/\\|/g')"
  else
    record "dashboard kanban local task lifecycle" FAIL "exit $dashboard_kanban_task_code: $(echo "$dashboard_kanban_task_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
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
if (data.pipeline?.source !== 'runtime-yaml' || data.pipeline?.deletable !== true) {
  throw new Error(`dashboard yaml proxy missing runtime metadata: ${JSON.stringify(data.pipeline)}`);
}
if (!data.pipelines?.some((pipeline) => pipeline.id === id && pipeline.source === 'runtime-yaml' && pipeline.deletable === true)) {
  throw new Error(`dashboard yaml proxy response did not return full pipeline definitions: ${JSON.stringify(data.pipelines)}`);
}
const templateRes = await fetch(`${base}/api/workflows/templates`, { cache: 'no-store' });
const templateData = await templateRes.json();
if (!templateData.templates?.some((template) => template.id === id && template.source === 'runtime-yaml' && template.deletable === true)) {
  throw new Error(`dashboard yaml proxy not exposed as workflow template: ${JSON.stringify(templateData)}`);
}
const deleteRes = await fetch(`${base}/api/pipelines/${id}`, { method: 'DELETE' });
const deleted = await deleteRes.json();
if (deleteRes.status !== 200 || deleted.deleted !== true) {
  throw new Error(`dashboard yaml delete proxy failed: ${deleteRes.status} ${JSON.stringify(deleted)}`);
}
console.log(`id=${id} deleted=${deleted.deleted}`);
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
  if [ "${RUN_LIVE_PIPELINE_FULL:-0}" = "1" ]; then
    live_request="${E2E_LIVE_USER_REQUEST:-E2E delivery gate dry-run: verify the dev-team-minimum-loop coordination lifecycle only. Produce markdown-only planning artifacts. Do not create, edit, delete, install, build, or write repository files. Do not run package managers. If a surface would normally implement code, describe the intended artifact and verification evidence instead.}"
    payload="$(E2E_LIVE_REQUEST="$live_request" python3 -c 'import json, os
print(json.dumps({
    "pipelineId": "dev-team-minimum-loop",
    "initialInput": {"userRequest": os.environ["E2E_LIVE_REQUEST"]},
    "options": {
        "dryRun": True,
        "surfaceTimeoutMs": int(os.environ.get("E2E_LIVE_SURFACE_TIMEOUT_MS", "300000")),
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
    set +e
    live_cancel_output="$(GATEWAY_URL="$GATEWAY_URL" E2E_LIVE_SURFACE_TIMEOUT_MS="${E2E_LIVE_SURFACE_TIMEOUT_MS:-60000}" node <<'NODE' 2>&1
const base = process.env.GATEWAY_URL;
const timeoutMs = Number(process.env.E2E_LIVE_SURFACE_TIMEOUT_MS || 60000);
const payload = {
  pipelineId: 'dev-team-minimum-loop',
  initialInput: {
    userRequest: 'E2E live smoke: call real Hermes Agent path, keep dry-run/no-write contract, then cancel safely.',
    requestedBy: 'e2e-live-cancel-smoke',
  },
  options: { dryRun: true, surfaceTimeoutMs: timeoutMs },
};

const startRes = await fetch(`${base}/v1/pipeline/start`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
const started = await startRes.json();
if (!startRes.ok || !started.instanceId || started.status !== 'running') {
  throw new Error(`live start failed: ${startRes.status} ${JSON.stringify(started)}`);
}

let runningInstance = started;
for (let i = 0; i < 20; i += 1) {
  await new Promise((resolve) => setTimeout(resolve, 250));
  const res = await fetch(`${base}/pipeline-instances/${started.instanceId}`);
  runningInstance = await res.json();
  if (!res.ok) {
    throw new Error(`live status failed: ${res.status} ${JSON.stringify(runningInstance)}`);
  }
  const runningSurfaces = Object.values(runningInstance.surfaceResults || {}).filter((result) => result?.status === 'running');
  if (runningSurfaces.length > 0) break;
}

const cancelRes = await fetch(`${base}/pipeline-instances/${started.instanceId}/cancel`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ reason: 'E2E live cancel smoke' }),
});
const cancelled = await cancelRes.json();
if (cancelRes.status !== 200 || cancelled.status !== 'cancelled') {
  throw new Error(`live cancel failed: ${cancelRes.status} ${JSON.stringify(cancelled)}`);
}

await new Promise((resolve) => setTimeout(resolve, 500));
const coordinationRes = await fetch(`${base}/pipeline-instances/${started.instanceId}/coordination`);
const coordination = await coordinationRes.json();
const statuses = coordination.bindings?.map((binding) => binding.task?.status) || [];
const blockedCount = statuses.filter((status) => status === 'blocked').length;
const experienceDocId = coordination.instance?.coordination?.documentIdsBySurface?._experience;
if (!coordinationRes.ok || statuses.length < 1 || blockedCount !== statuses.length || !experienceDocId) {
  throw new Error(`live cancel coordination failed: ${coordinationRes.status} ${JSON.stringify({
    statuses,
    blockedCount,
    experienceDocId,
  })}`);
}

const runningSurfaces = Object.values(runningInstance.surfaceResults || {})
  .filter((result) => result?.status === 'running')
  .map((result) => result.surfaceId);
console.log(`instance=${started.instanceId} runningSurfaces=${runningSurfaces.join(',') || 'none'} blocked=${blockedCount}/${statuses.length} experience=${experienceDocId}`);
NODE
)"
    live_cancel_code=$?
    set -e
    if [ "$live_cancel_code" -eq 0 ]; then
      record "live pipeline start cancel smoke" PASS "$(echo "$live_cancel_output" | tail -n 1 | sed 's/|/\\|/g')"
    else
      record "live pipeline start cancel smoke" FAIL "exit $live_cancel_code: $(echo "$live_cancel_output" | tail -n 3 | tr '\n' ' ' | sed 's/|/\\|/g')"
    fi
  fi
else
  record "live pipeline start cancel smoke" WARN "skipped; set RUN_LIVE_PIPELINE=1 when Hermes Agents are available"
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
