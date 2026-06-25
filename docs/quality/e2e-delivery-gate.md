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
- `GET /pipelines`
- `GET /v1/workflows`
- `GET /v1/templates`
- `dev-team-minimum-loop` is available through the Gateway

When Dashboard is already running, the same script also checks:

- `GET /`
- `GET /api/v2/documents`
- `GET /api/workflows`
- `GET /api/workflows/templates`

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

This triggers the minimum lifecycle pipeline through the Gateway:

```text
discovery -> planning -> [frontend, backend] -> testing -> release -> retrospective
```

Live pipeline verification is intentionally opt-in because it may call external model
APIs and can take several minutes.

The default live prompt is a dry-run coordination check. It instructs Agents to produce
markdown-only artifacts and avoid modifying the repository. If you intentionally want
the team to write files, set `E2E_LIVE_USER_REQUEST` explicitly and inspect the resulting
git diff before accepting the run.

Live runs also pass structured execution options to the Gateway:

- `dryRun: true` is forwarded into every Pipeline surface so Agents receive a no-write
  execution contract.
- dry-run Pipeline execution records a Git worktree status baseline and fails the run
  if repository status changes after a Surface completes.
- `surfaceTimeoutMs` defaults to `90000`; override it with `E2E_LIVE_SURFACE_TIMEOUT_MS`.
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
