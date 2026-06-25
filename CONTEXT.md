# DEV-Agent-Teams Context

## Purpose

DEV-Agent-Teams is the software-development-team distribution of Open-Agent-Teams.
Its job is to prove the Agent Team lifecycle loop for a development organization:

```
user request
-> meeting
-> document
-> kanban task
-> workflow
-> agent execution
-> test/deploy
-> archive experience
```

Open-Agent-Teams supplies the team coordination vocabulary. DEV-Agent-Teams supplies the
development-team roles, documents, workflows, and quality expectations.

## Domain Glossary

### Agent Team

An Agent Team is a long-lived organization made of role Agents, documents, tasks,
workflows, events, and accumulated experience. It is not just a group chat.

### Role Agent

A Role Agent is one professional surface of the team, such as `dev-pm`,
`dev-frontend`, `dev-backend`, `dev-testing`, `dev-devops`, or `project-admin`.
Hermes is the preferred runtime shape for a Role Agent because it provides skills,
memory, tools, and identity.

### Surface

A Surface is one face of the system with an input contract, output contract, owner
Agent, and optional gate. A Surface can represent a role, a document-producing phase,
a quality check, or a deployment step.

### Meeting

A Meeting is the parallel cognition mode. It is used when the problem is still
ambiguous: requirement clarification, architecture discussion, risk review, and
incident retrospectives. A Meeting should produce a Document, not just chat output.

### Workflow

A Workflow is the serial execution mode. It is used when the team knows the next
steps and wants reproducible progress. A Workflow should support checkpoint,
resume, rollback, and quality gates as the implementation matures.

### Kanban

Kanban is the team state projection. It binds tasks to assignees, documents,
workflow runs, status, progress, blockers, artifacts, and acceptance criteria.
Kanban is the state hub that connects parallel Meeting output to serial Workflow
execution.

### Document

A Document is the organizational memory carrier. PRDs, meeting notes, technical
plans, test reports, deployment records, task specs, code reviews, and retrospectives
are Documents. Documents are active collaboration objects: Agents can cite them,
update them, bind them to tasks, and use them as context.

### Artifact

An Artifact is an execution output produced by a Surface or Workflow step. Examples:
code, API specs, test reports, deployment logs, release notes, and generated docs.

### Experience

Experience is durable learning extracted from completed work or failures. It should
be written back as Documents or KnowledgeCenter entries so later work can reuse it.

### Team Coordination Layer

The Team Coordination Layer is the part DEV-Agent-Teams should deepen around:
Meeting, Document, Kanban, Workflow, Context, Event, and Experience. It should not
reimplement the single-Agent loop when a runtime adapter can do that work.

## Architecture Direction

Open-Agent-Teams should answer:

> How do many Agent loops behave like a managed, recoverable, auditable, learning team?

DEV-Agent-Teams should answer:

> How does a development team move one user request through requirement analysis,
> planning, implementation, testing, deployment, and experience capture?

## First Product Loop

The first product loop is intentionally narrow:

1. Intake a software-development request.
2. Run a meeting/discovery surface and create a PRD-style Document.
3. Plan Kanban tasks and bind them to Role Agents.
4. Execute frontend/backend implementation surfaces.
5. Run testing and release-readiness surfaces.
6. Capture deployment notes and retrospective experience.

This loop is the spine. New features should either strengthen this spine or clearly
belong to Open-Agent-Teams as a reusable team coordination primitive.
