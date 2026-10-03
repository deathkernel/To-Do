export type AuthProvider = "password" | "google" | "github" | "oidc";

export interface Session {
  id: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuthEvent {
  id: string;
  userId?: string;
  type: "login" | "logout" | "password_reset" | "mfa_enabled" | "session_revoked";
  createdAt: string;
  ipHash?: string;
}

export function isSessionActive(session: Session, now = new Date()): boolean {
  return !session.revokedAt && new Date(session.expiresAt).getTime() > now.getTime();
}

export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = [];
  if (password.length < 12) errors.push("Password must be at least 12 characters");
  if (!/[A-Z]/.test(password)) errors.push("Password must contain an uppercase letter");
  if (!/[a-z]/.test(password)) errors.push("Password must contain a lowercase letter");
  if (!/[0-9]/.test(password)) errors.push("Password must contain a number");
  return errors;
}
