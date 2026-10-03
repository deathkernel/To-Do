import crypto from "node:crypto";
import {createHash} from "node:crypto";
import {createSession,findSession,revokeSession} from "../../../packages/db/src/repositories";
export function hashSessionToken(token:string){return createHash("sha256").update(token).digest("hex")}
export async function persistSession(userId:string,days=30){const token=crypto.randomBytes(48).toString("base64url");await createSession({id:crypto.randomUUID(),userId,tokenHash:hashSessionToken(token),expiresAt:new Date(Date.now()+days*86400000)});return token}
export async function loadSession(token:string){const row=await findSession(hashSessionToken(token));if(!row||row.revokedAt||row.expiresAt<new Date())return null;return row}
export async function logoutSession(token:string){const row=await findSession(hashSessionToken(token));if(row)await revokeSession(row.id)}