import { describe, expect, it } from "vitest";
import { canCommentProject, canEditProject, canManageProject } from "./collaboration";
import { canManageWorkspace, canTransferOwnership, isActiveMember } from "./team";
import { validatePasswordPolicy, isSessionActive } from "./auth";
import { validateBackupManifest } from "./backup";
import { isValidSyncOperation } from "./sync";
import { isIntegrationActive, isTokenActive } from "./integration";

describe("platform domain contracts", () => {
  it("enforces collaboration roles", () => {
    expect(canCommentProject("viewer")).toBe(false);
    expect(canCommentProject("editor")).toBe(true);
    expect(canEditProject("manager")).toBe(true);
    expect(canManageProject("editor")).toBe(false);
    expect(canManageProject("manager")).toBe(true);
  });

  it("enforces workspace roles", () => {
    expect(canManageWorkspace("member")).toBe(false);
    expect(canManageWorkspace("admin")).toBe(true);
    expect(canTransferOwnership("owner")).toBe(true);
    expect(isActiveMember({ workspaceId: "w", userId: "u", role: "member", active: true, joinedAt: new Date().toISOString() })).toBe(true);
  });

  it("validates authentication invariants", () => {
    expect(validatePasswordPolicy("short")).not.toHaveLength(0);
    const session = { id: "s", userId: "u", createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60_000).toISOString() };
    expect(isSessionActive(session)).toBe(true);
  });

  it("validates backup manifests", () => {
    expect(validateBackupManifest({ schemaVersion: 1, exportedAt: new Date().toISOString(), accountId: "a", resourceCounts: {} }).valid).toBe(true);
  });

  it("validates sync operations", () => {
    expect(isValidSyncOperation({
      operationId: "op", actorId: "u", clientId: "c", clientTimestamp: new Date().toISOString(),
      baseRevision: 0, resourceType: "task", resourceId: "t", mutation: { title: "x" }
    })).toBe(true);
  });

  it("supports integration revocation state", () => {
    const connection = { id: "i", ownerId: "u", kind: "oauth" as const, provider: "example", scopes: [], createdAt: new Date().toISOString() };
    const token = { id: "t", ownerId: "u", name: "cli", scopes: [], createdAt: new Date().toISOString() };
    expect(isIntegrationActive(connection)).toBe(true);
    expect(isTokenActive(token)).toBe(true);
    expect(isTokenActive({ ...token, revokedAt: new Date().toISOString() })).toBe(false);
  });
});
