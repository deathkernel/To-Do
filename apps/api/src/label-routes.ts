import type {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import {z} from "zod";
import {requireScope} from "./require-auth";
import {insertLabel,listUserLabels,updateLabel,deleteLabel} from "../../../packages/db/src/repositories";
const createLabelSchema=z.object({name:z.string().trim().min(1).max(100),color:z.string().max(32).nullable().optional(),description:z.string().max(10000).nullable().optional()});
const updateLabelSchema=createLabelSchema.partial();
const idSchema=z.object({id:z.string().uuid()});
export function registerLabelRoutes(app:FastifyInstance){
 app.get("/api/v1/labels",async(req,reply)=>{try{const u=await requireScope(req,"labels:read");return listUserLabels(u.id);}catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:401).send({error:e instanceof Error?e.message:"Authentication required"});}});
 app.post("/api/v1/labels",async(req,reply)=>{try{const u=await requireScope(req,"labels:write");const b=createLabelSchema.parse(req.body);const now=new Date();return reply.code(201).send(await insertLabel({id:randomUUID(),userId:u.id,name:b.name,color:b.color??null,description:b.description??null,favorite:false,createdAt:now,updatedAt:now}));}catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Invalid label"});}});
 app.patch("/api/v1/labels/:id",async(req,reply)=>{try{const u=await requireScope(req,"labels:write");const {id}=idSchema.parse(req.params);const b=updateLabelSchema.parse(req.body);return reply.send(await updateLabel(u.id,id,b));}catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Invalid label update"});}});
 app.delete("/api/v1/labels/:id",async(req,reply)=>{try{const u=await requireScope(req,"labels:write");const {id}=idSchema.parse(req.params);await deleteLabel(u.id,id);return reply.code(204).send();}catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Unable to delete label"});}});
}