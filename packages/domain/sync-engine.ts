import type {SyncOperation,SyncResponse} from "./sync";
export function processOperation(operation:SyncOperation,knownIds:Set<string>,currentRevision:number):SyncResponse{
  if(knownIds.has(operation.operationId))return {operationId:operation.operationId,result:"rejected",revision:currentRevision,cursor:String(currentRevision),reason:"duplicate_operation"};
  if(operation.baseRevision!==currentRevision)return {operationId:operation.operationId,result:"conflicted",revision:currentRevision,cursor:String(currentRevision),reason:"stale_revision"};
  knownIds.add(operation.operationId);
  const revision=currentRevision+1;
  return {operationId:operation.operationId,result:"accepted",revision,cursor:String(revision)};
}