# Batch 04 — Collaboration, Security, Data & Integrations

Covers features 17–22: Collaboration, Team/Business Workspace, Authentication & Security, Backup/Restore & Data, Sync & Offline Mode, and Integrations & Public API.

These are production-oriented domain/API foundations, not a claim that the production server, database, UI, queues, OAuth providers, or sync engine are complete.

## Cross-cutting rules
- Every user-owned resource is user/tenant scoped.
- Team resources require explicit membership and role authorization.
- Sensitive operations are auditable.
- External credentials are scoped and revocable.
- Sync mutations are idempotent and conflict-aware.
- Destructive restores require explicit authorization and audit logging.
