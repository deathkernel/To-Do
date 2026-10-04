# Deep Audit — 2026-10-04

## Scope
Audited the canonical Python/Flask/PostgreSQL/Redis application, vanilla JS frontend, PWA shell/service worker, worker process, Docker Compose configuration, database schema, authentication/session model, authorization paths, task relationships, sync, automation, reminders, backup, API-token handling, and regression tests.

## Fixed during this audit

- Removed duplicate Flask endpoint registrations.
- Corrected frontend static asset paths and repaired malformed JavaScript strings.
- Fixed the session/API-token namespace collision and made token lookup hash-based rather than prefix-dependent.
- Stabilized frontend startup authentication and partial-data loading.
- Added missing navigation handlers and prevented keyboard shortcuts from firing on the unauthenticated screen.
- Prevented the service worker from caching /api/ responses.
- Scoped the offline mutation queue to the current user and clear it on logout.
- Added favicon serving and PWA shell registration.
- Added stricter task/project/section/parent/assignee/workspace relationship checks.
- Blocked parent-task cycles and self-parenting.
- Blocked cyclic task dependencies.
- Added input bounds for task descriptions, recurrence/position metadata, comments, workspaces, sections, projects, labels and automation/template payloads.
- Added strict hex-color validation and safe client-side color rendering.
- Fixed local date/time editing so UTC conversion does not shift displayed datetime-local values.
- Removed an inline label click handler that could create an XSS path for label names containing quotes; label selection now uses a stable ID.
- Made registration and session creation transactional.
- Made sync revision increments serialized/atomic.
- Fixed bulk priority/move operations so activity/sync history is recorded.
- Hardened reminder and automation validation and owner scoping.
- Prevented automation action recursion.
- Prevented MFA setup from rotating an already-active MFA secret.
- Made MFA disable require the current password.
- Hardened malformed public MFA/password-reset request handling.
- Password reset now also revokes active API tokens.
- Fixed backup export ownership mapping for templates.
- Added notification-to-task linkage and overdue/reminder deduplication.
- Added automation execution-history API.
- Added database integrity constraints for task/project relationships, status/priority/range fields and time-block ranges.
- Added security response headers.
- Added Docker healthchecks and service startup ordering.
- Kept core navigation accessible on mobile layouts.
- Expanded regression tests for auth, API-token behavior, security headers, frontend navigation, favicon, automation validation and service-worker caching.

## Verification

The repository Python CI uses:
- python -m py_compile app.py db.py worker.py
- python -m pytest -q
- PostgreSQL and Redis service containers

The audit also checks route duplication and frontend handler/function contracts.

## Known non-bug integration boundaries

These are intentionally not faked as implemented:
- External Google/GitHub/OIDC OAuth login
- Real outbound email delivery
- Web Push/APNs/FCM
- External calendar providers
- Managed object storage
- Native Windows/Android/iOS binaries

## Remaining production-scale work

- Full Todoist-compatible recurrence grammar and natural-language date semantics
- Full boolean/nested filter grammar and scalable server-side search
- Realtime collaboration transport
- Distributed durable job queue and retry/dead-letter semantics
- Full offline conflict-resolution UI
- Webhook delivery, signing and replay protection
- Advanced historical reporting
- Full accessibility automation
- Load/soak/security test suites
- Production WSGI deployment and observability stack
- Transactional consistency for every multi-resource mutation, rather than only the highest-risk flows audited here
- Data retention/archival policies for sync operations, activity logs and notifications