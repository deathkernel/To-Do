# Feature 19 — Authentication & Security

## Scope
- Registration, login, logout.
- Session and refresh-token lifecycle.
- Password hashing using a vetted library.
- Email verification and password reset.
- Optional MFA.
- OAuth/OIDC provider abstraction.
- Device/session management and revocation.
- Rate limiting and abuse controls.
- CSRF protection where cookie auth is used.
- Security audit logging.

## Invariants
- Passwords are never stored plaintext.
- Refresh tokens are revocable and preferably rotated.
- Authorization is independent of UI visibility.
- Tokens are scoped to their audience.
- Secrets are never committed to the repository.
