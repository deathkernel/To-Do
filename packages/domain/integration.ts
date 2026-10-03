export type IntegrationKind = "oauth" | "pat" | "webhook" | "calendar" | "email";

export interface IntegrationConnection {
  id: string;
  ownerId: string;
  kind: IntegrationKind;
  provider: string;
  scopes: string[];
  createdAt: string;
  revokedAt?: string;
}

export interface ApiToken {
  id: string;
  ownerId: string;
  name: string;
  scopes: string[];
  createdAt: string;
  revokedAt?: string;
}

export function isIntegrationActive(connection: IntegrationConnection): boolean {
  return !connection.revokedAt;
}

export function isTokenActive(token: ApiToken): boolean {
  return !token.revokedAt;
}
