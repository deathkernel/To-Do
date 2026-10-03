# Feature 23 — Automation & Workflow

## Scope
- Trigger/action automation rules.
- Event triggers: task created, completed, overdue, scheduled, project/label changes.
- Conditions and branching.
- Actions: create/update/complete task, move project/section, add label, assign user, send notification, webhook.
- Delayed actions and scheduled workflows.
- Enable/disable and execution history.
- Idempotency and retry handling.
- Failure isolation and dead-letter handling.

## Safety
- Automations execute with explicit owner/workspace permissions.
- Destructive actions require explicit configuration.
- Recursive trigger loops must be detected/prevented.
- Every execution is auditable.
