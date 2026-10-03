# Authentication
The API uses bearer tokens signed with HS256 for the initial runtime. Passwords are hashed with Argon2id. Clients never send a password on ordinary task/project operations.
Production hardening still includes external OAuth/OIDC providers, persistent sessions, refresh-token rotation, email verification, password reset, MFA and audit storage.
Set AUTH_SECRET to a long random secret outside development.