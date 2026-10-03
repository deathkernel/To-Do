# Security Model

## Trust boundaries
1. Browser/mobile client — untrusted.
2. API — authorization and validation boundary.
3. Database/storage — trusted infrastructure, but not authorization truth.
4. External providers — untrusted integration boundary.
5. Background workers — privileged application components.

## Required controls
- Authenticate before private-resource access.
- Authorize every resource mutation.
- Scope every query by user/workspace ownership.
- Hash passwords with a modern vetted algorithm/library.
- Protect transport and secrets at the infrastructure layer.
- Rotate/revoke sessions and integration credentials.
- Rate-limit authentication and expensive endpoints.
- Validate uploaded files and restrict content types/size.
- Record security-relevant events.
- Never log passwords, raw access tokens, refresh tokens, or API keys.
