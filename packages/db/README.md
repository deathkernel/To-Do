# @todo/db
PostgreSQL persistence using Drizzle ORM.
Local: start PostgreSQL with docker compose, then run `pnpm --filter @todo/db generate` and `pnpm --filter @todo/db migrate`.
Domain repositories remain interface-based so tests can use in-memory adapters.