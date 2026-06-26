# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**DEV-Agent-Teams** is the software-development-team distribution of **Open-Agent-Teams**. Its product spine is the Team Coordination Loop:

```
Meeting -> Document -> Kanban -> Workflow -> Artifact -> Experience
```

The current implementation uses Hermes HTTP Agent instances for vertical role depth, plus local coordination modules for intent routing, meetings, pipelines, documents, kanban, knowledge, sessions, events, and token budgets. Treat the system as a Team Coordination Layer, not just a multi-agent chat wrapper.

## Architecture

```
Dashboard (Next.js :3000) -> Gateway (:8400) -> Core AgentApp
                                                   |
                                                   v
                                            TeamOrchestrator
                                                   |
                   +-------------------------------+-------------------------------+
                   v           v           v           v          v                v
              Frontend     Backend     Testing      DevOps       PM        Project Admin
                Agent       Agent       Agent        Agent      Agent          Agent
```

**Key patterns:**
- **TeamOrchestrator** (`packages/core/src/team/TeamOrchestrator.ts`): Core entry point for single Agent, team, meeting, and routed requests. It calls Hermes Agent instances through `HermesAgentClient`.
- **Agent App** (`packages/core/src/agent-factory.ts`): HTTP API layer with Express, SessionManager, and OpenAI-compatible `/v1/chat/completions` endpoint
- **Gateway** (`packages/gateway/src/api-gateway.ts`): Thin HTTP proxy that delegates to TeamOrchestrator, handles audit logging
- **PipelineOrchestrator** (`packages/core/src/pipeline/Orchestrator.ts`): Surface-based workflow engine for the "one body, many faces" model.
- **DocumentManager / KnowledgeCenter** (`packages/core/src/knowledge/`): Document and knowledge persistence for organizational memory.
- **Kanban tools** (`packages/core/src/tools/kanban-tools.ts`): Task state projection and Agent-operable board actions.
- **SessionManager** (`packages/core/src/session/SessionManager.ts`): SQLite-backed session persistence.

## Common Commands

```bash
# Install dependencies (pnpm workspaces)
pnpm install

# Start/stop services
./dev-agent start          # Start Gateway and Dashboard
./dev-agent stop           # Kill all processes
./dev-agent status         # Health-check

# Development
cd packages/core && pnpm run check      # Type-check core
cd packages/gateway && pnpm dev         # Gateway with hot-reload
cd packages/dashboard && pnpm dev       # Dashboard dev server
cd packages/dashboard && pnpm lint      # Lint dashboard

# Testing
./dev-agent test           # Run gateway integration tests
./scripts/run-tests.sh     # Full test suite
```

## Key Files

| Purpose | Path |
|---------|------|
| Team Orchestrator | `packages/core/src/team/TeamOrchestrator.ts` |
| HTTP API Layer | `packages/core/src/agent-factory.ts` |
| Session Manager | `packages/core/src/session/SessionManager.ts` |
| Gateway | `packages/gateway/src/api-gateway.ts` |
| Dashboard agents lib | `packages/dashboard/src/lib/agents.ts` |
| Environment template | `.env.example` |

## Configuration

- **Environment**: Copy `.env.example` to `.env`. Key vars: `MODEL_NAME`, `MODEL_BASE_URL`, `API_KEY`
- **Monorepo**: pnpm workspaces — `packages/core`, `packages/gateway`, `packages/dashboard`, `packages/agents/*`

## Development Notes

- **Team Coordination Layer**: DEV-Agent-Teams should deepen Meeting, Document, Kanban, Workflow, Artifact, Experience, Context, and Event modules.
- **Framework sync requirement**: When DEV-Agent-Teams changes shared/core framework capabilities such as orchestration, pipeline control/recovery, documents, kanban, delivery gates, dashboard observability, provider compatibility, or local startup reliability, mirror the reusable change back into `/Users/zhuizhui/网盘同步/work/学习/AI/Open-Agent-Teams` before considering the work fully delivered.
- **Avoid wheel rebuilding**: Do not reimplement single-Agent runtime loops when Hermes or another runtime adapter can own that behavior.
- **Minimum lifecycle**: Keep the first product loop narrow: request -> meeting/PRD -> kanban planning -> implementation surfaces -> testing -> release -> retrospective.
- **E2E delivery gate**: Every development result must run closed-loop verification. At minimum run `bash scripts/e2e-delivery-gate.sh`; when Hermes Agents are available run it with `RUN_LIVE_PIPELINE=1`.
- **MiMo API**: Uses OpenAI-compatible endpoint via `createAdapter('openai', apiKey, baseURL)`
- TypeScript strict mode, ES2022 target, ESNext modules with bundler resolution
