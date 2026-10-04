# Runtime API Surface

Authentication: register, login, logout, session listing/revocation, email verification, password reset, TOTP MFA, provider discovery.
Core: tasks, bulk actions, duplicate/permalink, task labels, dependencies, projects, sections, project/workspace members, labels, search and saved filters.
Planning: reminders, snooze, calendar, time-blocks.
Productivity: goals and analytics.
Collaboration: comments, attachments, workspaces and activity feed.
Automation: rules and execution history.
Developer/data: scoped API tokens, backup export/import, sync push/pull, device registration.
AI: provider-neutral quick-add, breakdown and rewrite adapters.
Web app: HTML/CSS/vanilla JS frontend, PWA manifest/service worker and responsive list/board/calendar views.

The runtime is the canonical Python + Flask + PostgreSQL + Redis implementation. External OAuth/OIDC providers, outbound email delivery, push providers, external calendars, managed object storage and native desktop/mobile binaries remain explicit integration boundaries rather than fake local implementations.
