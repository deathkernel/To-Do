# Feature 22 — Integrations & Public API

## Scope
- Versioned public REST API.
- Personal access tokens.
- OAuth application authorization.
- Webhooks.
- Calendar/email provider adapters.
- Import/export adapters.
- Integration lifecycle and revocation.
- Usage limits and request auditing.

## API principles
- Version endpoints such as /api/v1/...
- Stable resource identifiers.
- Idempotency for retryable writes.
- Pagination for collections.
- Consistent error envelopes.
- Explicit scopes for tokens/apps.
- Webhook signatures and replay protection.
- Rate-limit headers.
- Documented deprecation/migration paths.
