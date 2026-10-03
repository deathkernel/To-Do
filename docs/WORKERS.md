# Background Workers
Required jobs: reminders, notifications, automations, sync, backups.
Handlers must be idempotent. Retry transient failures with bounded exponential backoff. Permanent failures go to a dead-letter mechanism.
The repository currently contains an in-memory queue for deterministic tests; production wiring should use durable Redis-backed jobs.