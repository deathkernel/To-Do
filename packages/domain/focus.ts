export interface FocusState{sessionId:string;startedAt:string;taskId?:string;paused:boolean;}
export function focusDurationMinutes(startedAt:string,endedAt=new Date().toISOString()){return Math.max(0,Math.round((Date.parse(endedAt)-Date.parse(startedAt))/60000));}
export function canStartFocus(active:FocusState|null){return active===null||active.paused;}