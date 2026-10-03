import type {IntegrationConnection,ApiToken} from "./integration";
export function usableConnection(c:IntegrationConnection){return !c.revokedAt;}
export function usableToken(t:ApiToken,now=new Date()){return !t.revokedAt;}
export function validateScopes(granted:string[],required:string[]){const set=new Set(granted);return required.every(scope=>set.has(scope));}