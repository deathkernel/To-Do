import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {z} from "zod";
import {requireScope} from "./require-auth";
import {listProjectSections,createSection,updateSection,deleteSection} from "../../../packages/db/src/section-repository";

const projectParams=z.object({projectId:z.string().uuid()});
const sectionParams=z.object({id:z.string().uuid()});
const createSchema=z.object({name:z.string().trim().min(1).max(200),position:z.number().int().min(0).optional()});
const updateSchema=createSchema.partial();

export function registerSectionRoutes(app:FastifyInstance){
  app.get("/api/v1/projects/:projectId/sections",async(req,reply)=>{
    try{const u=await requireScope(req,"projects:read");const {projectId}=projectParams.parse(req.params);return reply.send(await listProjectSections(u.id,projectId));}
    catch(e){return reply.code(401).send({error:e instanceof Error?e.message:"Authentication required"});}
  });
  app.post("/api/v1/projects/:projectId/sections",async(req,reply)=>{
    try{const u=await requireScope(req,"projects:write");const {projectId}=projectParams.parse(req.params);const b=createSchema.parse(req.body);return reply.code(201).send(await createSection(u.id,{id:crypto.randomUUID(),projectId,name:b.name,position:b.position??0}));}
    catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Invalid section"});}
  });
  app.patch("/api/v1/sections/:id",async(req,reply)=>{
    try{const u=await requireScope(req,"projects:write");const {id}=sectionParams.parse(req.params);const b=updateSchema.parse(req.body);return reply.send(await updateSection(u.id,id,b));}
    catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Invalid section update"});}
  });
  app.delete("/api/v1/sections/:id",async(req,reply)=>{
    try{const u=await requireScope(req,"projects:write");const {id}=sectionParams.parse(req.params);await deleteSection(u.id,id);return reply.code(204).send();}
    catch(e){return reply.code(e instanceof Error&&e.message.startsWith("API token lacks")?403:400).send({error:e instanceof Error?e.message:"Unable to delete section"});}
  });
}
