import type {IntegrationConnection,ApiToken} from "./integration";
export function usableConnection(c:IntegrationConnection){return c.enabled&&!c.revokedAt;}
export function usableToken(t:ApiToken,now=new Date()){return !t.revokedAt&&(!t.expiresAt||new Date(t.expiresAt)>now);}