# To-Do

A Todoist-style productivity workspace built on **Python, Flask, PostgreSQL, Redis, HTML5, CSS3 and vanilla JavaScript**.

## Canonical stack

- Python + Flask: application server and REST API
- PostgreSQL 17: durable application storage
- Redis 7: rate limiting and background-work infrastructure
- HTML5/CSS3/vanilla JavaScript: web application
- Docker Compose: local and containerized runtime
- No React, TypeScript, Vite, Node.js or pnpm in the canonical application

## Run locally

Start infrastructure:

    docker compose up -d postgres redis

Create and activate the environment:

    python -m venv .venv

Windows:

    .venv\Scripts\activate

Install dependencies:

    pip install -r requirements.txt

Start the web app:

    python -u app.py

Open:

    http://127.0.0.1:3000

Run the worker in a second terminal:

    python worker.py

## Runtime coverage

The Python runtime currently includes authenticated tasks and projects, nested tasks and projects, labels, dependencies, bulk task actions, search and saved filters, reminders and in-app notifications, comments, local attachments, goals and analytics, calendar/time blocks, templates, backup export/import, synchronization records, automations, device registration, scoped API tokens, TOTP MFA, password recovery/verification tokens, rate limiting, a PWA shell, and an OpenAI-compatible AI boundary.

## Provider-dependent integrations

OAuth/OIDC login, real email delivery, push credentials, external calendar synchronization, cloud object storage and native desktop/Android/iOS packages require external credentials or release infrastructure. They are kept behind explicit adapters rather than being represented as fake local integrations.

## Quality

CI runs Python compilation and pytest against PostgreSQL and Redis service containers.

## Project layout

    To-Do/
    ├── app.py
    ├── db.py
    ├── schema.sql
    ├── worker.py
    ├── requirements.txt
    ├── Dockerfile
    ├── docker-compose.yml
    ├── templates/
    ├── static/
    ├── tests/
    └── docs/
