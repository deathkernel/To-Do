# Feature 17 — Collaboration

## Scope
- Share projects with users.
- Invite/remove collaborators.
- Roles: viewer, commenter, editor, manager.
- Assign tasks to collaborators.
- Comments, activity history, mentions, and notifications.
- Leave shared projects without deleting project data.

## Acceptance criteria
- Non-members cannot read private resources.
- Role checks happen server-side for every mutation.
- Assignment is limited to eligible project members.
- Removed members immediately lose future access.
- Activity events identify actor, action, target, and timestamp.
- Notification failure never corrupts core task state.
