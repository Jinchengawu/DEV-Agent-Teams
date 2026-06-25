# E2E Delivery Gate

Every development result in DEV-Agent-Teams must be verified as a closed delivery loop,
not only as isolated type checks.

## Gate Levels

### Level 1: Static Delivery Gate

Run this for every code or architecture change:

```bash
bash scripts/e2e-delivery-gate.sh
```

This verifies:

- core TypeScript type check
- gateway TypeScript build
- dashboard TypeScript type check
- required domain docs exist
- the built-in minimum lifecycle pipeline is wired into Core

### Level 2: Gateway Delivery Gate

When Gateway is already running, the same script also checks:

- `GET /health`
- `GET /agent-health`
- `GET /pipelines`
- `GET /v1/workflows`
- `GET /v1/templates`
- `dev-team-minimum-loop` is available through the Gateway
- `stock-analysis-system` is loaded from the YAML Pipeline example
- an inline YAML Pipeline can be registered through `POST /pipelines/load-yaml`
  restored after a Gateway restart, and deleted through `DELETE /pipelines/:id`
- runtime YAML Pipelines are listed and exposed as workflow templates with
  `source: "runtime-yaml"` and `deletable: true`
- YAML registration responses include full Pipeline definitions so Dashboard can
  refresh the list immediately after import
- Pipeline-generated documents are retrievable through `projectId` + `taskId`
  context filters

When Dashboard is already running, the same script also checks:

- `GET /`
- `GET /api/health`
- `GET /api/v2/documents`
- `GET /api/workflows`
- `GET /api/pipeline-instances`
- `GET /api/workflows/templates`
- the Pipeline control proxy returns honest unsupported errors when control smoke is enabled
- `POST /api/pipelines/load-yaml` proxies runtime Pipeline registration to the Gateway
  and `DELETE /api/pipelines/:id` proxies runtime Pipeline deletion
- Dashboard workflow templates include runtime YAML metadata for custom Pipelines
- Dashboard Pipeline history can recover persisted instances with coordination bindings
- Dashboard Workflows records link to their Pipeline instance and project documents
- Dashboard Workflows records expose stable navigation links to Pipeline, Knowledge, and Kanban
- Dashboard Pipeline instance history exposes stable navigation links to Pipeline, Knowledge, and Kanban
- Dashboard Pipeline coordination summaries expose stable project, task, document, and board links
- Dashboard Pipeline page exposes a YAML importer for runtime custom workflows
- Knowledge links can preserve project/task context for workflow documents
- Kanban coordination tasks expose project links and related document counts
- Kanban coordination tasks link back to their Pipeline instance and Surface context
- Dashboard health exposes live Pipeline readiness from real Hermes Agent health

To verify the Pipeline control plane against a running Gateway, opt in with:

```bash
RUN_PIPELINE_CONTROL_SMOKE=1 bash scripts/e2e-delivery-gate.sh
```

This starts `dev-team-minimum-loop` in dry-run mode, immediately cancels it, and verifies
that the instance includes coordination bindings such as `projectId` and Surface task IDs.
It also fetches the coordination summary and asserts that all unfinished Surface tasks are
marked `blocked`, so the Kanban projection does not show stale queued work. Finally, it
verifies that the run captured an `_experience` document and linked it to the retrospective
task. It is opt-in because it creates a real Pipeline instance plus project/task records in
the local document database. The same smoke also checks that unsupported control actions
(`pause`, `resume`, and `rollback`) fail honestly with `supported: false` instead of
pretending to mutate Pipeline state.

The same opt-in gate also runs a forced timeout smoke with `surfaceTimeoutMs: 1`. It verifies
that a timed-out dry-run Pipeline fails instead of hanging, exposes the failed Surface, marks
all coordination tasks `blocked`, and still captures the `_experience` document. It then
attempts to cancel the failed instance and expects a `409`, proving terminal Pipeline history
cannot be rewritten by a late control request. The dry-run Git status comparison wraps both
the cancel and timeout flows, so repository side effects are reported as a delivery failure.
When Dashboard is available, the same control gate verifies that the Dashboard Pipeline API
forwards the selected `surfaceTimeoutMs` option by starting a 1ms dry-run and observing the
expected failed Surface.
The gate also checks Gateway and Dashboard Pipeline instance filters (`status`, `pipelineId`,
and `limit`) so long-running MVP sessions can keep history views bounded and reviewable.
Workflow list filters are covered in the same way, including Gateway and Dashboard proxy
checks for `status` and `limit`.
Dashboard Kanban local task operations are also exercised as a closed loop:
create a task, update its status/progress, delete it, and confirm it no longer resolves.
Kanban board filtering is covered for coordination tasks so large task sets stay usable
during long MVP sessions. The same check also asserts that recent coordination tasks keep
their Pipeline instance and Surface links, and that the overall Kanban projection preserves
workflow links for at least 95% of recoverable coordination tasks.
Kanban coordination tasks must also expose stable `knowledge_url` and `workflow_url`
fields. The gate resolves those URLs through the Dashboard document and Pipeline proxies
so task cards are verified as real navigation points across Kanban, Documents, and
Workflows.
For compatibility, the legacy Dashboard `/api/knowledge` proxy must preserve the same
`projectId` and `taskId` context as `/api/v2/documents`; the gate checks both paths so
older integrations do not silently drop document scope.

To verify restart recovery, opt in with:

```bash
RUN_PIPELINE_RECOVERY_SMOKE=1 bash scripts/e2e-delivery-gate.sh
```

This starts a dry-run Pipeline instance, restarts the local Gateway while the run is still
active, and then verifies that the interrupted instance is recovered as `failed` with a
clear restart error. It also asserts that all coordination tasks are marked `blocked` and
that the interrupted run captured an `_experience` document linked to the retrospective
task. It is opt-in because it restarts the local Gateway and creates local project/task
records.

### Level 3: Live Pipeline Gate

When Hermes Agent instances and model credentials are available, run:

```bash
RUN_LIVE_PIPELINE=1 bash scripts/e2e-delivery-gate.sh
```

By default this starts the minimum lifecycle pipeline asynchronously through the Gateway,
waits for the real Hermes-backed execution path to become observable, then cancels the
instance and verifies that Kanban tasks are blocked and an `_experience` document is
captured. This keeps live verification bounded while still proving that live Agent work can
be stopped cleanly.

To force a full live lifecycle completion check, add `RUN_LIVE_PIPELINE_FULL=1`:

```bash
RUN_LIVE_PIPELINE=1 RUN_LIVE_PIPELINE_FULL=1 bash scripts/e2e-delivery-gate.sh
```

The full run triggers the entire minimum lifecycle pipeline:

```text
discovery -> planning -> [frontend, backend] -> testing -> release -> retrospective
```

Full live pipeline verification is intentionally opt-in because it may call external model
APIs and can take several minutes.

The default live prompt is a dry-run coordination check. It instructs Agents to produce
markdown-only artifacts and avoid modifying the repository. If you intentionally want
the team to write files, set `E2E_LIVE_USER_REQUEST` explicitly and inspect the resulting
git diff before accepting the run.

The bounded live start/cancel smoke defaults to `60000ms` per Surface. Full live surface
calls default to `300000ms` because real Hermes Agents, especially DevOps release checks,
can take longer than the UI dry-run path. Override either path with
`E2E_LIVE_SURFACE_TIMEOUT_MS` when debugging latency.

Live runs also pass structured execution options to the Gateway:

- `dryRun: true` is forwarded into every Pipeline surface so Agents receive a no-write
  execution contract.
- dry-run Pipeline execution records a Git worktree status baseline and fails the run
  if repository status changes after a Surface completes or before the run exits.
- `surfaceTimeoutMs` defaults to `60000` for bounded live smoke and `300000` for full live
  completion; override it with `E2E_LIVE_SURFACE_TIMEOUT_MS`.
- `RUN_PIPELINE_CONTROL_SMOKE=1` compares Git status before and after a dry-run
  control flow so repository side effects are visible in the delivery report.
- Dashboard-triggered Pipelines use the same dry-run and timeout defaults, but run
  asynchronously through `POST /v1/pipeline/start` so the UI can poll or cancel the
  instance.

## Definition of Done

A change is not considered delivered until the final response reports:

- which gate level was run
- whether it passed
- what could not be run and why
- any residual risks
- any repository side effects produced by live Agent execution

## Product Quality Principle

The project goal is not "the code compiles." The goal is:

> a user request can travel through the team coordination loop and leave usable
> documents, tasks, workflow artifacts, and experience.
