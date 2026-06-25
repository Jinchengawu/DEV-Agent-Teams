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
