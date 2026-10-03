export type SyncResult = "accepted" | "rejected" | "conflicted";

export interface SyncOperation {
  operationId: string;
  actorId: string;
  clientId: string;
  clientTimestamp: string;
  baseRevision: number;
  resourceType: string;
  resourceId: string;
  mutation: Record<string, unknown>;
}

export interface SyncResponse {
  operationId: string;
  result: SyncResult;
  revision: number;
  cursor: string;
  resource?: Record<string, unknown>;
  reason?: string;
}

export function isValidSyncOperation(operation: SyncOperation): boolean {
  return Boolean(
    operation.operationId &&
    operation.actorId &&
    operation.clientId &&
    operation.resourceType &&
    operation.resourceId &&
    Number.isInteger(operation.baseRevision) &&
    operation.baseRevision >= 0
  );
}
