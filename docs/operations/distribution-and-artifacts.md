# Distribution And Artifact Governance

DEV-Agent-Teams is a downstream product built on Open-Agent-Teams. It should be
distributed as a product runtime while keeping framework primitives in
Open-Agent-Teams packages.

## Distribution Units

| Unit | Package | Deployable | Notes |
| --- | --- | --- | --- |
| Core product logic | `@dev-agent/core` | library | Domain team profile, DEV lifecycle, product-specific orchestration defaults |
| Gateway | `@dev-agent/gateway` | service | Public API surface for Dashboard and integrations |
| Dashboard | `@dev-agent/dashboard` | web app | Product console |
| Glue service | `@dev-agent/glue-service` | library/service adapter | Integration boundary |

`@dev-agent/core` should depend on `@open-agent-teams/core` through one of:

- local `link:` during active framework co-development
- `file:` tarball for reproducible private release candidates
- private registry version for production distribution

Do not copy framework source into DEV-Agent-Teams.

## Deployment Profiles

### Local MVP

```bash
MODEL_SPEND_GUARD=1 ./dev-agent start
RUN_PIPELINE_CONTROL_SMOKE=1 RUN_PIPELINE_RECOVERY_SMOKE=1 zsh scripts/e2e-delivery-gate.sh
```

Use this profile for product testing without provider spend.

### Private Server

Build and run:

```bash
cd packages/core && pnpm run build
cd ../gateway && pnpm run build
cd ../dashboard && pnpm run build

GATEWAY_PORT=8400 node packages/gateway/dist/api-gateway.js
PORT=3000 pnpm --filter @dev-agent/dashboard start
```

Required persistent volumes:

- `~/.dev-agent/data`
- `~/.dev-agent/logs`
- any configured upload directory

### Container Profile

Containerization should treat Gateway and Dashboard as separate processes:

- Gateway image exposes `8400`
- Dashboard image exposes `3000`
- Both mount the same configured data volume when local SQLite is used
- Production deployments should move shared state to a managed database before
  horizontal scaling

Reference local compose deployment:

```bash
cd deploy
docker compose up --build
```

Reference files:

- `deploy/Dockerfile.gateway`
- `deploy/Dockerfile.dashboard`
- `deploy/docker-compose.yml`

The compose profile defaults to `MODEL_SPEND_GUARD=1`, stores runtime data in
the `dev-agent-data` volume, and stores audit logs in `dev-agent-logs`. Live
model execution should only be enabled by explicitly overriding the environment
after a budget is approved.

## Artifact Classes

| Artifact | Owner | Storage | Rule |
| --- | --- | --- | --- |
| Project records | Product runtime | `~/.dev-agent/data` | Persistent; migrate, do not delete during upgrade |
| Documents / PRD / reports | Product runtime | document DB | Must link to project/task/workflow when possible |
| Kanban tasks | Product runtime | document/task DB | Must preserve pipeline and surface metadata |
| Pipeline instances | Product runtime | workflow/pipeline stores | Terminal records are immutable except metadata repair |
| Delivery gate reports | Engineering | `scripts/test-reports` | Keep curated release evidence; clean noisy local reports |
| Codex backfill outputs | Engineering/Product | runtime DB + docs | Must mark `externalModelTokens=0` |
| Derived products | Product strategy | separate repo | Must pin Open-Agent-Teams dependency and define own TeamProfile |

## Release Manifest

Before a release candidate:

```bash
node scripts/release-manifest.mjs
```

The script writes `release-manifests/release-manifest-*.json` with:

- product version
- git commit and dirty state
- Open-Agent-Teams dependency mode
- deployable service commands
- artifact retention classes
- package inventory

Commit only release manifests that correspond to an actual reviewed release
candidate. Local exploratory manifests can be deleted.

Recommended release checklist:

```bash
node scripts/release-manifest.mjs
RUN_PIPELINE_CONTROL_SMOKE=1 RUN_PIPELINE_RECOVERY_SMOKE=1 zsh scripts/e2e-delivery-gate.sh
cd deploy && docker compose config
```

## Derivative Product Rule

When DEV-Agent-Teams is used to create another product, such as
Legal-Agent-Teams or Video-Agent-Teams:

1. Create a new repo for the domain product.
2. Depend on `@open-agent-teams/core`; reuse `@open-agent-teams/gateway` unless
   the product needs custom API boundaries.
3. Define a domain `TeamProfile` and lifecycle pipelines in the new repo.
4. Keep generated product artifacts in that repo's runtime storage and release
   manifests.
5. If a generic capability is discovered, backport it to Open-Agent-Teams before
   treating the derivative as production-ready.

This keeps DEV as the development-team product, Open as the framework, and
domain derivatives as clean product lines instead of tangled forks.
