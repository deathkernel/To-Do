import type {FastifyInstance} from "fastify";
import {randomUUID} from "node:crypto";
import {authenticated} from "./middleware";
import {insertLabel,listUserLabels} from "../../../packages/db/src/repositories";
export function registerLabelRoutes(app:FastifyInstance){
 app.get("/api/v1/labels",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return listUserLabels(u.id)});
 app.post("/api/v1/labels",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"Label name is required"});const now=new Date();return reply.code(201).send(await insertLabel({id:randomUUID(),userId:u.id,name:b.name.trim(),color:b.color??null,description:b.description??null,favorite:false,createdAt:now,updatedAt:now}))});
}