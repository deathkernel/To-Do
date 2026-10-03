# Feature 21 — Sync & Offline Mode

## Scope
- Local cache for active user data.
- Offline create/edit/complete.
- Operation queue with idempotency keys.
- Incremental pull using cursor/version.
- Incremental push of pending operations.
- Retry with backoff.
- Conflict detection and deterministic resolution.
- Tombstones for deleted records.
- Connectivity and sync status.

## Sync mutation
Each mutation carries operationId, actorId, clientId, clientTimestamp, baseRevision, resourceType, resourceId, and mutation payload.

The server returns accepted/rejected/conflicted status, authoritative revision, canonical resource when needed, and next cursor.

Never silently overwrite a newer server revision.
