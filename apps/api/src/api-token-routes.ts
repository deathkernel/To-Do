import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {createHash} from "node:crypto";
import {authenticated} from "./middleware";
import {insertApiToken,listApiTokens} from "../../../packages/db/src/repositories";
function publicToken(row:any){const {tokenHash,...safe}=row;return {...safe,scopes:typeof safe.scopes==="string"?JSON.parse(safe.scopes):safe.scopes};}
export function registerApiTokenRoutes(app:FastifyInstance){
 app.get("/api/v1/api-tokens",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return (await listApiTokens(u.id)).map(publicToken);});
 app.post("/api/v1/api-tokens",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const raw="td_"+crypto.randomBytes(32).toString("hex");const b=req.body as any;const scopes=Array.isArray(b?.scopes)?b.scopes.filter((x:any)=>typeof x==="string"):["tasks:read","tasks:write"];if(scopes.length>20)return reply.code(400).send({error:"Too many scopes"});const item=await insertApiToken({id:crypto.randomUUID(),ownerId:u.id,name:typeof b?.name==="string"&&b.name.trim()?b.name.trim():"API token",tokenHash:createHash("sha256").update(raw).digest("hex"),scopes:JSON.stringify(scopes)});return reply.code(201).send({...publicToken(item),token:raw});});
}