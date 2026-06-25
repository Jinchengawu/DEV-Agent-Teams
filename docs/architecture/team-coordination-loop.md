# Team Coordination Loop

## Summary

DEV-Agent-Teams should prove the Open-Agent-Teams thesis through one concrete loop:

```
Meeting -> Document -> Kanban -> Workflow -> Artifact -> Experience
```

This loop turns many Agent loops into a team system. A single Agent can think and act;
an Agent Team must also remember, coordinate, recover, and improve.

## Four First-Class Collaboration Objects

### Meeting

Meeting is the parallel cognition mode. It is used before the team has enough clarity
to execute. The expected output is a decision-bearing Document, not a transcript dump.

Examples:

- requirement clarification
- architecture discussion
- risk review
- incident retrospective

### Document

Document is the organizational memory carrier. It binds the team together across time.
Every important Meeting, Workflow, Kanban task, quality check, and release should
leave or update a Document.

Examples:

- PRD
- meeting summary
- technical plan
- task specification
- test report
- deployment report
- retrospective
- reusable experience note

### Kanban

Kanban is the team state projection. It answers what exists, who owns it, what state
it is in, what Document explains it, what Workflow is running, and what blocks it.

Kanban should not be treated as a static task list. It is the state hub that triggers
Workflow execution and receives status updates from Agents.

### Workflow

Workflow is the serial execution mode. It is used after the team has enough clarity
to move through known steps. Workflow should become progressively more reliable:
checkpoint, resume, rollback, gates, and test evidence.

## Minimum Development Lifecycle

The minimum lifecycle for DEV-Agent-Teams is:

1. `discovery` - PM leads requirement clarification and meeting summary.
2. `planning` - project-admin creates a task plan and Kanban-ready breakdown.
3. `frontend` - frontend Agent proposes or implements UI work.
4. `backend` - backend Agent proposes or implements backend/API/data work.
5. `testing` - testing Agent verifies outputs and produces a test report.
6. `release` - DevOps Agent prepares deployment/release notes.
7. `retrospective` - project-admin captures experience and follow-up tasks.

The first implementation is a Pipeline template, not a full autonomous delivery
system. It creates a stable spine that future code can deepen.

## Event Spine

The long-term event model should preserve these transitions:

```text
meeting.completed
-> document.created
-> kanban.task.created
-> kanban.task.status_changed
-> workflow.started
-> workflow.completed
-> document.updated
-> experience.captured
```

Current code already has partial EventBus, DocumentManager, Kanban tools,
KnowledgeCenter, and Pipeline surfaces. The near-term job is to connect those pieces
through stable interfaces instead of growing separate pass-through modules.

## Implementation Rule

Open-Agent-Teams and DEV-Agent-Teams should avoid reimplementing single-Agent runtime
features. Use adapters for Hermes, LangGraph, OpenAI Agents SDK, ADK, CrewAI, or
other runtimes where possible. The differentiated module is the Team Coordination
Layer: Meeting, Document, Kanban, Workflow, Context, Event, and Experience.
