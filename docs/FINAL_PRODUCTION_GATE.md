# Final Production Gate

## Local verification
1. Start PostgreSQL and Redis with Docker Compose.
2. Activate the Python virtual environment and install requirements.
3. Run `python -m py_compile app.py db.py worker.py`.
4. Run `pytest -q`.
5. Run `python -u app.py`.
6. Run `python worker.py` in a second terminal.
7. Verify `/health` and `/ready`.
8. Exercise authentication, tasks, projects, sections, labels, reminders, comments, attachments, goals, analytics, backup, sync and automations.
9. Verify authorization with two separate test accounts.

## Production requirements
Use secure production values for `DATABASE_URL`, `REDIS_URL`, `AUTH_SECRET` and provider credentials. Configure HTTPS, durable PostgreSQL backups, managed Redis, secure object/file storage, outbound email, OAuth/OIDC, push providers, calendar adapters, logs, metrics, alerts and backup retention.

The canonical CI gate is Python compilation plus pytest. The legacy pnpm/TypeScript gate is retired.

Do not claim provider-dependent integrations as live until their credentials, callbacks, delivery paths and end-to-end tests have been verified.
