import type {SyncOperation,SyncResponse} from "./sync";
export function acceptOperations(operations:SyncOperation[],knownIds:Set<string>):SyncResponse{
  const accepted:string[]=[],rejected:string[]=[],conflicted:string[]=[];
  for(const op of operations){if(knownIds.has(op.id)){rejected.push(op.id);continue;} if(op.baseRevision!==undefined&&op.baseRevision<0){conflicted.push(op.id);continue;} accepted.push(op.id);knownIds.add(op.id);}
  return {accepted,rejected,conflicted,cursor:String(Date.now())};
}