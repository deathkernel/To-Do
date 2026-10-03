import type {ProjectMembership,ProjectRole} from "./collaboration";
export function canEdit(role:ProjectRole){return role==="editor"||role==="manager";}
export function canManage(role:ProjectRole){return role==="manager";}
export function canComment(role:ProjectRole){return role!=="viewer";}