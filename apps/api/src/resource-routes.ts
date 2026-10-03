import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {authenticated} from "./middleware";
const store={reminders:new Map<string,any>(),comments:new Map<string,any>(),goals:new Map<string,any>(),automations:new Map<string,any>(),workspaces:new Map<string,any>()};
export function registerResourceRoutes(app:FastifyInstance){
  app.get("/api/v1/reminders",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return [...store.reminders.values()].filter(x=>x.userId===u.id);});
  app.post("/api/v1/reminders",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;const item={id:crypto.randomUUID(),userId:u.id,...b,createdAt:new Date().toISOString()};store.reminders.set(item.id,item);return reply.code(201).send(item);});
  app.get("/api/v1/goals",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return [...store.goals.values()].filter(x=>x.userId===u.id);});
  app.post("/api/v1/goals",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const item={id:crypto.randomUUID(),userId:u.id,...req.body as any,createdAt:new Date().toISOString()};store.goals.set(item.id,item);return reply.code(201).send(item);});
  app.get("/api/v1/comments/:taskId",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const {taskId}=req.params as any;return [...store.comments.values()].filter(x=>x.userId===u.id&&x.taskId===taskId);});
  app.post("/api/v1/comments/:taskId",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const {taskId}=req.params as any;const b=req.body as any;if(typeof b.body!=="string"||!b.body.trim())return reply.code(400).send({error:"Comment body required"});const item={id:crypto.randomUUID(),userId:u.id,taskId,body:b.body.trim(),createdAt:new Date().toISOString()};store.comments.set(item.id,item);return reply.code(201).send(item);});
  app.get("/api/v1/automations",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return [...store.automations.values()].filter(x=>x.ownerId===u.id);});
  app.post("/api/v1/automations",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const item={id:crypto.randomUUID(),ownerId:u.id,...req.body as any,enabled:true,createdAt:new Date().toISOString()};store.automations.set(item.id,item);return reply.code(201).send(item);});
  app.get("/api/v1/workspaces",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return [...store.workspaces.values()].filter(x=>x.ownerId===u.id);});
  app.post("/api/v1/workspaces",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const item={id:crypto.randomUUID(),ownerId:u.id,...req.body as any,createdAt:new Date().toISOString()};store.workspaces.set(item.id,item);return reply.code(201).send(item);});
}