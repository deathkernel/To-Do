# Implementation Status

Canonical stack: Python + Flask + PostgreSQL + Redis + HTML5 + CSS3 + vanilla JavaScript.

## Implemented runtime
- [x] Python/Flask server and versioned REST API
- [x] PostgreSQL schema initialization with incremental column compatibility
- [x] Server-side sessions and Argon2 password hashing
- [x] Email verification and password-reset token flows
- [x] Optional TOTP MFA
- [x] Redis-backed request rate limiting when Redis is available
- [x] Projects, sections and nested project relationships
- [x] Workspace/project membership and server-side role checks
- [x] Tasks with subtasks, assignees, priorities, start/due/deadline, duration, timezone and recurrence metadata
- [x] Task completion/reopen/restore/soft delete
- [x] Bulk task operations, duplicate and permalink
- [x] Labels, task-label assignment and dependencies
- [x] Search and saved filter records
- [x] Reminder persistence, in-app notifications and background worker
- [x] Comments and secure local attachment upload/download
- [x] Goals, completion analytics and project progress
- [x] Calendar data and time-block conflict detection
- [x] Templates and apply/duplicate/update/delete flows
- [x] JSON backup export/import foundation
- [x] Cursor-based idempotent synchronization records
- [x] Automation rules and execution history
- [x] Provider-neutral AI boundary for quick-add/breakdown/rewrite
- [x] Scoped personal API tokens and device registration
- [x] PWA shell, service worker and responsive list/board/calendar UI
- [x] Python compilation + pytest CI gate

## Provider/environment-dependent
OAuth/OIDC login, real outbound email, web/mobile push, external calendar providers, managed/cloud object storage and native desktop/Android/iOS binaries require external provider credentials or release infrastructure. These remain explicit adapter boundaries rather than fake local implementations.

## Still below full production parity
Full recurrence language semantics, nested boolean filter grammar, realtime collaboration, true offline conflict UI, durable distributed job queues, webhook delivery/replay protection, advanced reporting/history, accessibility automation, load/security suites and production observability still need deeper implementation before a production parity claim.
