export interface ApiScope{resource:string;actions:("read"|"write"|"delete")[];}
export function hasApiScope(scopes:string[],required:string){return scopes.includes("*")||scopes.includes(required);}
export function validateIdempotencyKey(value:string){if(!/^[A-Za-z0-9._:-]{8,128}$/.test(value))throw new Error("Invalid idempotency key");return value;}