# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DEV-Agent-Teams** is a multi-agent collaborative development system using **@open-multi-agent/core** for horizontal orchestration and **Hermes** for vertical domain depth. Five specialized AI agents (Frontend, Backend, Testing, DevOps, PM) collaborate via the framework's built-in MessageBus, SharedMemory, and TaskQueue.

## Architecture

```
Dashboard (Next.js :3000) → Gateway (:8400) → TeamOrchestrator (in-process)
                                                    │
                              ┌─────────┬───────────┼───────────┬─────────┐
                              ▼         ▼           ▼           ▼         ▼
                         Frontend   Backend     Testing      DevOps       PM
                          Agent      Agent       Agent       Agent      Agent
```

**Key patterns:**
- **TeamOrchestrator** (`packages/core/src/team/TeamOrchestrator.ts`): Core entry point wrapping `@open-multi-agent/core`'s `OpenMultiAgent`. Provides `runTeam()` (auto task DAG), `runAgent()` (single agent), `runTasks()` (explicit task list)
- **Agent App** (`packages/core/src/agent-factory.ts`): HTTP API layer with Express, SessionManager, and OpenAI-compatible `/v1/chat/completions` endpoint
- **Gateway** (`packages/gateway/src/api-gateway.ts`): Thin HTTP proxy that delegates to TeamOrchestrator, handles audit logging
- **SessionManager** (`packages/core/src/session/SessionManager.ts`): SQLite-backed session persistence (the only self-implemented storage module — framework's SharedMemory is in-memory only)

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

- **Single-process model**: All agents run in one Node.js process, communicating via `@open-multi-agent/core`'s in-process MessageBus (not HTTP)
- **Framework-first**: Orchestration (task decomposition, DAG execution, delegation, retry, loop detection) is handled by `@open-multi-agent/core`. Do NOT re-implement these patterns
- **SessionManager is the exception**: SQLite session persistence is self-implemented because the framework's SharedMemory is in-memory only
- **MiMo API**: Uses OpenAI-compatible endpoint via `createAdapter('openai', apiKey, baseURL)`
- TypeScript strict mode, ES2022 target, ESNext modules with bundler resolution
