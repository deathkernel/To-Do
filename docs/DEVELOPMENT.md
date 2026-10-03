# Development Guide

## Workflow
1. Define the feature and acceptance criteria.
2. Design/update domain models and API contracts.
3. Implement backend business logic.
4. Implement client UI and state handling.
5. Add tests.
6. Run lint/type/test/build checks.
7. Update README checklist and documentation.
8. Commit with a focused message.

## Quality bar
- No secrets committed.
- No silent data loss.
- Core task operations must remain usable offline.
- Server-side authorization is mandatory; client checks are not security boundaries.
- User-visible failures must provide actionable feedback.
- Database migrations must be reproducible.
