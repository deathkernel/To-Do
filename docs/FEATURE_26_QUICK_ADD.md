# Feature 26 — Quick Add & Power-User Features

## Scope
- Natural quick-add syntax.
- Date/time parsing.
- Priority parsing.
- Project/section parsing.
- Label parsing.
- Assignee parsing.
- Recurrence parsing.
- Keyboard command palette.
- Global quick-add entry point.
- Bulk edit.
- Duplicate task/project.
- Multi-select actions.
- Slash/command-style shortcuts where supported.

## Parsing rule
Quick-add converts user input into a structured command. The resulting command must pass normal domain validation and authorization before persistence.
