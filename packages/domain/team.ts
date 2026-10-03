export type WorkspaceRole = "owner" | "admin" | "member" | "guest";

export interface Workspace {
  id: string;
  name: string;
  createdAt: string;
}

export interface WorkspaceMember {
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  active: boolean;
  joinedAt: string;
}

export function canManageWorkspace(role?: WorkspaceRole): boolean {
  return role === "owner" || role === "admin";
}

export function canTransferOwnership(role?: WorkspaceRole): boolean {
  return role === "owner";
}

export function isActiveMember(member?: WorkspaceMember): boolean {
  return Boolean(member?.active);
}
