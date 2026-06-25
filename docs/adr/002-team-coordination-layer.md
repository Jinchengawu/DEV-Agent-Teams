# ADR-002: Team Coordination Layer as the DEV-Agent-Teams Spine

## Status

Accepted - 2026-06-25

## Context

DEV-Agent-Teams has grown several useful modules: IntentRouter, TeamOrchestrator,
PipelineOrchestrator, EventBus, DocumentManager, KnowledgeCenter, Kanban tools,
SessionManager, and HermesAgentClient.

The risk is architectural drift: if each module grows independently, the product
becomes a collection of Agent utilities rather than a coherent development-team
system.

The product thesis is that Open-Agent-Teams is valuable when it binds many Agent
loops into a managed, recoverable, auditable, and learning team system. For
DEV-Agent-Teams, the concrete proof is a software delivery lifecycle.

## Decision

Treat the Team Coordination Layer as the spine of DEV-Agent-Teams:

```text
Meeting -> Document -> Kanban -> Workflow -> Artifact -> Experience
```

Promote these collaboration objects to first-class domain language:

- Meeting: parallel cognition and consensus formation
- Document: organizational memory carrier
- Kanban: team state projection and trigger hub
- Workflow: serial execution path
- Artifact: execution output
- Experience: durable learning from completed work

The first code-level proof is a built-in minimum development lifecycle Pipeline:

```text
discovery -> planning -> [frontend, backend] -> testing -> release -> retrospective
```

## Consequences

Positive:

- Gives the project a clear product loop instead of a broad framework slogan.
- Lets the existing Pipeline, Document, Kanban, Knowledge, and Hermes modules point
  at one shared direction.
- Creates a reusable pattern for future Legal-Agent-Teams, Finance-Agent-Teams, and
  other team templates.

Negative:

- Some existing docs still describe older `@open-multi-agent/core`-first architecture
  and will need cleanup.
- The first Pipeline is a coordination skeleton; it does not yet guarantee code
  changes, test execution, deployment, or rollback.

## Non-Goals

- Do not reimplement a full single-Agent loop.
- Do not replace Hermes, LangGraph, OpenAI Agents SDK, ADK, CrewAI, or Mastra.
- Do not build a generic document editor or generic project-management tool.

## Follow-Up

- Bind DocumentManager documents to Kanban tasks through explicit IDs.
- Emit document and experience events.
- Add checkpoint/resume/rollback semantics to lifecycle Pipeline runs.
- Add a Dashboard view that shows the loop as one connected lifecycle, not isolated
  pages.
