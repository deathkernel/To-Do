export type CollaborationRole = "viewer" | "commenter" | "editor" | "manager";

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: CollaborationRole;
  addedAt: string;
}

export function canReadProject(role?: CollaborationRole): boolean {
  return role !== undefined;
}

export function canCommentProject(role?: CollaborationRole): boolean {
  return role === "commenter" || role === "editor" || role === "manager";
}

export function canEditProject(role?: CollaborationRole): boolean {
  return role === "editor" || role === "manager";
}

export function canManageProject(role?: CollaborationRole): boolean {
  return role === "manager";
}
