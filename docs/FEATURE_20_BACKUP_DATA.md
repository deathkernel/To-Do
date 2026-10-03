# Feature 20 — Backup, Restore & Data

## Scope
- Full account/workspace export.
- Machine-readable JSON export.
- Attachment metadata/content references.
- Import validation and dry-run.
- Restore into a new namespace or controlled overwrite flow.
- Soft-delete recovery where supported.
- Large-export progress.
- Retention and deletion policies.

## Safety
- Export requires authenticated authorization.
- Restore validates schema versions.
- Imports cannot bypass ownership checks.
- Destructive overwrite requires explicit confirmation and audit logging.
- Sensitive export artifacts require controlled access and expiration.
