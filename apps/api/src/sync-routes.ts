import type {FastifyInstance} from "fastify";
import {authenticated} from "./middleware";
import {isValidSyncOperation} from "../../../packages/domain/sync";
import {processOperation} from "../../../packages/domain/sync-engine";
const seen=new Set<string>();let revision=0;
export function registerSyncRoutes(app:FastifyInstance){app.post("/api/v1/sync",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;const ops=Array.isArray(b.operations)?b.operations:[];const results=ops.map((op:any)=>{if(op.actorId!==u.id||!isValidSyncOperation(op))return {operationId:op.operationId??"",result:"rejected",reason:"invalid_operation"};const result=processOperation(op,seen,revision);if(result.result==="accepted")revision=result.revision;return result;});return reply.send({revision,results,cursor:String(revision)});});}