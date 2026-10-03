# Database migrations
1. Start local infrastructure with `docker compose up -d postgres redis`.
2. Copy `.env.example` to `.env`.
3. Install dependencies with pnpm.
4. Generate migrations with `pnpm db:generate`.
5. Apply with `pnpm db:migrate`.
6. Inspect schema before production deployment.
Never use `db:push` against production. Back up the database before destructive migrations.