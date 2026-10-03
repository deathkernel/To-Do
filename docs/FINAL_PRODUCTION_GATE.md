# Final Production Gate
Before production release:
- run `pnpm test` and `pnpm typecheck`
- run database migrations against a backup
- set AUTH_SECRET, DATABASE_URL, REDIS_URL and CORS_ORIGIN
- use durable Redis-backed workers
- configure object storage
- configure calendar/AI providers
- run E2E, authorization, file-security, load and accessibility suites
- configure HTTPS, logs, metrics, alerts and backups
- verify graceful shutdown and readiness checks
No provider account or deployment environment is assumed by the repository.