# Codex Backfill Mode

DEV-Agent-Teams can keep product work moving when external model providers are unavailable or too expensive. In this mode, Codex produces the business artifacts in the development environment and persists them into the same project/document/kanban/workflow stores used by the Dashboard.

## Default Guard

Local startup now defaults to:

```bash
MODEL_SPEND_GUARD=1
```

When this guard is enabled:

- `IntentRouter` does not call an external LLM for routing.
- `TeamOrchestrator.runAgent()` returns a zero-token blocked result before Hermes/model calls.
- Pipeline surfaces fail honestly instead of spending provider balance.

To intentionally re-enable live model calls:

```bash
ALLOW_LIVE_MODEL=1 MODEL_SPEND_GUARD=0 ./dev-agent start
```

Only do this when the provider account is funded and the run budget is explicit.

## Legal-Agent-Teams Backfill

Seed the current legal-domain engineering practice project without external model calls:

```bash
node scripts/codex-backfill-legal-team.mjs --json
```

The script writes:

- Runtime pipeline YAML: `~/.dev-agent/data/pipelines/legal-agent-team-production-loop.yaml`
- Project: `proj-codex-legal-agent-teams-mvp`
- Pipeline instance: `pipeline-codex-legal-agent-teams-mvp`
- 7 coordination tasks
- 7 linked documents
- Workflow state with `input_tokens=0` and `output_tokens=0`

Useful Dashboard URLs:

- `/pipeline?instanceId=pipeline-codex-legal-agent-teams-mvp`
- `/knowledge?projectId=proj-codex-legal-agent-teams-mvp`
- `/kanban?source=coordination`

## Audit Rule

Every Codex-backfilled artifact must include metadata:

```json
{
  "generatedBy": "codex",
  "executionMode": "codex-backfill",
  "externalModelTokens": 0,
  "humanApproved": false
}
```

This keeps cost accounting and legal/compliance review honest.
