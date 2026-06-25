# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase.

## Before exploring, read these

- `CONTEXT.md` at the repo root.
- `docs/adr/` for accepted architectural decisions that touch the area under work.

This is currently a single-context repo for domain-doc purposes. The monorepo packages
share one Agent Team domain model.

## Use the glossary's vocabulary

When output names a domain concept, use the term as defined in `CONTEXT.md`. Important
terms include Agent Team, Role Agent, Surface, Meeting, Workflow, Kanban, Document,
Artifact, Experience, and Team Coordination Layer.

## Flag ADR conflicts

If a proposal contradicts an existing ADR, surface it explicitly rather than silently
overriding it.
