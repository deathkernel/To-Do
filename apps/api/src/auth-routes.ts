import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {authenticate,login,register} from "./auth";
import {persistSession,logoutSession} from "./session-store";
const registerSchema=z.object({email:z.string().trim().email().max(320),password:z.string().min(10).max(1024),displayName:z.string().trim().min(1).max(120)});
const loginSchema=z.object({email:z.string().trim().email().max(320),password:z.string().min(1).max(1024)});
export function registerAuthRoutes(app:FastifyInstance){
  app.post("/api/v1/auth/register",async(req,reply)=>{try{const b=registerSchema.parse(req.body);const user=await register(b.email,b.password,b.displayName);const token=await persistSession(user.id);return reply.code(201).send({user,token});}catch(e){return reply.code(400).send({error:e instanceof Error?e.message:"Registration failed"});}});
  app.post("/api/v1/auth/login",async(req,reply)=>{try{const b=loginSchema.parse(req.body);return reply.send(await login(b.email,b.password));}catch(e){return reply.code(401).send({error:e instanceof Error?e.message:"Invalid credentials"});}});
  app.post("/api/v1/auth/logout",async(req,reply)=>{const h=req.headers.authorization;if(h?.startsWith("Bearer "))await logoutSession(h.slice(7));return reply.code(204).send();});
  app.get("/api/v1/auth/me",async(req,reply)=>{try{return reply.send(await authenticate(req.headers.authorization));}catch(e){return reply.code(401).send({error:e instanceof Error?e.message:"Authentication required"});}});
}