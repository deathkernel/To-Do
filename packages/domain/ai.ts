export type AiCapability = "task_create"|"task_breakdown"|"prioritize"|"schedule"|"filter"|"summarize"|"plan";
export interface AiProvider { name:string; complete(input:{capability:AiCapability; prompt:string}):Promise<{text:string; metadata?:Record<string,unknown>}>; }
export interface AiRequest { id:string; userId:string; capability:AiCapability; input:string; provider:string; createdAt:string; }
