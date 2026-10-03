import type {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import {authenticated} from "./middleware";
import {insertProject,listUserProjects} from "../../../packages/db/src/repositories";
export function registerProjectRoutes(app:FastifyInstance){
 app.get("/api/v1/projects",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return listUserProjects(u.id)});
 app.post("/api/v1/projects",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"Project name is required"});const now=new Date();return reply.code(201).send(await insertProject({id:randomUUID(),userId:u.id,name:b.name.trim(),description:b.description??null,color:b.color??null,icon:b.icon??null,favorite:false,archived:false,position:0,createdAt:now,updatedAt:now}))});
}