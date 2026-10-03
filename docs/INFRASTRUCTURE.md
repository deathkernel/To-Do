# Infrastructure Layer
- PostgreSQL repository helpers live in `packages/db/src/repositories.ts`.
- Background jobs use the `JobQueue` contract. Production should swap the in-memory adapter for Redis/BullMQ or an equivalent durable queue.
- Files use the `ObjectStorage` contract. Production should swap the in-memory adapter for S3/R2/Azure Blob.
- Calendar providers implement `CalendarAdapter`; credentials stay outside task data.
- Workers must be idempotent and retry transient failures with bounded backoff.