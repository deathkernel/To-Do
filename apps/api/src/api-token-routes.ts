import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {createHash} from "node:crypto";
import {authenticated} from "./middleware";
const tokens=new Map<string,any>();
export function registerApiTokenRoutes(app:FastifyInstance){app.get("/api/v1/api-tokens",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return [...tokens.values()].filter(x=>x.ownerId===u.id).map(({tokenHash,...x})=>x);});app.post("/api/v1/api-tokens",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const raw="td_"+crypto.randomBytes(32).toString("hex");const item={id:crypto.randomUUID(),ownerId:u.id,name:(req.body as any)?.name??"API token",tokenHash:createHash("sha256").update(raw).digest("hex"),scopes:(req.body as any)?.scopes??["tasks:read","tasks:write"],createdAt:new Date().toISOString()};tokens.set(item.id,item);return reply.code(201).send({...item,token:raw});});}