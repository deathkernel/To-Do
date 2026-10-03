import type {FastifyInstance} from "fastify";
import crypto from "node:crypto";
import {authenticated} from "./middleware";
import {createReminder,listReminders} from "../../../packages/db/src/reminder-repository";
import {insertComment,listTaskComments} from "../../../packages/db/src/repositories";
import {listAutomationRules,createAutomationRule} from "../../../packages/db/src/automation-repository";
import {insertWorkspace,listWorkspaces} from "../../../packages/db/src/repositories";
export function registerResourceRoutes(app:FastifyInstance){
 app.get("/api/v1/reminders",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return listReminders(u.id);});
 app.post("/api/v1/reminders",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;const item=await createReminder({id:crypto.randomUUID(),userId:u.id,taskId:b.taskId,trigger:b.trigger,triggerAt:b.triggerAt?new Date(b.triggerAt):null,minutesBefore:b.minutesBefore??null,locationId:b.locationId??null,recurringRule:b.recurringRule??null,enabled:b.enabled!==false});return reply.code(201).send(item);});
 app.get("/api/v1/comments/:taskId",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const {taskId}=req.params as {taskId:string};return listTaskComments(taskId,u.id);});
 app.post("/api/v1/comments/:taskId",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const {taskId}=req.params as {taskId:string};const b=req.body as any;if(typeof b.body!=="string"||!b.body.trim())return reply.code(400).send({error:"Comment body required"});const item=await insertComment({id:crypto.randomUUID(),userId:u.id,taskId,body:b.body.trim()});return reply.code(201).send(item);});
 app.get("/api/v1/automations",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return listAutomationRules(u.id);});
 app.post("/api/v1/automations",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;const item=await createAutomationRule({id:crypto.randomUUID(),ownerId:u.id,name:b.name,trigger:b.trigger,conditions:b.conditions??[],actions:b.actions??[],enabled:b.enabled!==false});return reply.code(201).send(item);});
 app.get("/api/v1/workspaces",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;return listWorkspaces(u.id);});
 app.post("/api/v1/workspaces",async(req,reply)=>{const u=await authenticated(req,reply);if(!u)return;const b=req.body as any;if(typeof b.name!=="string"||!b.name.trim())return reply.code(400).send({error:"Workspace name required"});const item=await insertWorkspace({id:crypto.randomUUID(),ownerId:u.id,name:b.name.trim()});return reply.code(201).send(item);});
}