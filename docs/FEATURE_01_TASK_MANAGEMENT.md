# Feature 01 — Task Management

## Scope
The first implementation milestone covers the complete core task lifecycle.

## Required capabilities
- Create, edit, complete and reopen tasks
- Delete and restore tasks
- Titles and descriptions
- Markdown/plain-text descriptions
- Nested subtasks
- Priorities P1-P4
- Due date and due time
- Task duration
- Deadline
- Recurrence metadata
- Task status
- Ordering / position
- Duplicate and move task operations
- Bulk operations
- Task permalink
- Soft deletion
- Audit timestamps

## Acceptance criteria
1. Every task belongs to a user and may optionally belong to a project/section.
2. A task can contain nested subtasks without imposing a shallow hierarchy.
3. Completing a parent must not silently destroy or complete children.
4. Deleted tasks are recoverable until permanent deletion is explicitly requested.
5. Due dates/times are stored timezone-aware.
6. Duration is represented independently from due time.
7. Deadline is distinct from the planned due date.
8. Task ordering is deterministic.
9. Bulk operations are atomic from the user's perspective.
10. No operation may silently overwrite another user's task.

## Status
- [x] Product specification
- [ ] Data model
- [ ] API
- [ ] UI
- [ ] Tests
- [ ] Documentation
- [ ] Production hardening
