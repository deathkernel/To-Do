import type {CollaborationRole} from "./collaboration";
export function canEdit(role:CollaborationRole){return role==="editor"||role==="manager";}
export function canManage(role:CollaborationRole){return role==="manager";}
export function canComment(role:CollaborationRole){return role!=="viewer";}