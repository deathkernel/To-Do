# To-Do

A productivity workspace built with **Python, Flask, PostgreSQL, Redis, HTML5, CSS3 and vanilla JavaScript**.

## Canonical stack

- Python + Flask: application server and REST API
- PostgreSQL 17: persistent storage
- Redis 7: infrastructure for cache/jobs
- HTML5: application shell
- CSS3: responsive visual system and themes
- Vanilla JavaScript: browser state, API calls and interactions
- Docker Compose: local database infrastructure

The canonical app is served from one Python process. There is no frontend build step.

## Run locally

Start PostgreSQL and Redis:

    docker compose up -d

Create a virtual environment:

    python -m venv .venv

Activate it on Windows:

    .venvScriptsactivate

Install dependencies:

    pip install -r requirements.txt

Start the app:

    python app.py

Open:

    http://127.0.0.1:3000

The application initializes the PostgreSQL schema automatically.

## Environment

Copy .env.example to .env when custom settings are needed.

Development defaults:

    DATABASE_URL=postgresql://todo:todo_dev_only@localhost:5432/todo
    REDIS_URL=redis://localhost:6379
    HOST=127.0.0.1
    PORT=3000

## Current backend surface

Authentication and sessions, tasks, task lifecycle, projects, sections, labels, search, reminders, comments and scoped API tokens are implemented in Flask. The schema also retains workspaces, goals, automations, templates, devices, task labels, dependencies and synchronization tables for continued feature expansion.

## Project layout

    To-Do/
    ├── app.py
    ├── db.py
    ├── schema.sql
    ├── requirements.txt
    ├── templates/
    │   └── index.html
    ├── static/
    │   ├── app.js
    │   └── styles.css
    ├── docker-compose.yml
    └── docs/

Historical architecture and product planning notes remain under docs/.
