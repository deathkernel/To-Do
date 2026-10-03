# Runtime API Surface
Authentication: POST /api/v1/auth/register, POST /api/v1/auth/login, GET /api/v1/auth/me.
Core: /api/v1/tasks, /api/v1/projects, /api/v1/labels, /api/v1/search/tasks.
Planning: /api/v1/reminders, /api/v1/sync.
Productivity: /api/v1/goals.
Collaboration: /api/v1/comments/:taskId, /api/v1/workspaces.
Automation: /api/v1/automations.
Developer access: /api/v1/api-tokens.
The current resource stores are runtime adapters; PostgreSQL repositories remain the persistence target before production deployment.