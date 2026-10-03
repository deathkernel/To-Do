# Sync Model

The client maintains a local representation plus an operation queue. The server is authoritative for canonical revisions.

## Push
Client sends idempotent operations with operationId and baseRevision. The server authenticates the actor, checks authorization, validates the mutation, and applies it only when the base revision is compatible.

## Pull
Client supplies a cursor. Server returns ordered changes and a next cursor. Deletions are represented as tombstones until supported clients can converge.

## Conflict handling
- Non-overlapping fields may be merged only where resource policy explicitly permits.
- Concurrent incompatible edits produce a conflict.
- The server never silently discards a newer authoritative revision.
- Retried operations with the same operationId are idempotent.

## Recovery
A failed operation remains inspectable and retryable. Authentication failures require re-authentication rather than blind retries.
