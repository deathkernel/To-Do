import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {checkDatabase} from "../../../packages/db/src/client";
import {registerAuthRoutes} from "./auth-routes";
import {registerTaskRoutes} from "./task-routes";
import {registerProjectRoutes} from "./project-routes";
import {registerLabelRoutes} from "./label-routes";
import {registerSearchRoutes} from "./search-routes";
import {registerResourceRoutes} from "./resource-routes";
import {registerSyncRoutes} from "./sync-routes";
import {registerApiTokenRoutes} from "./api-token-routes";
export function buildServer(){const app=Fastify({logger:true,bodyLimit:Number(process.env.REQUEST_BODY_LIMIT??1048576)});const allowed=(process.env.CORS_ORIGIN?.split(",").map(x=>x.trim()).filter(Boolean)??["http://localhost:5173","http://127.0.0.1:5173","http://localhost:5174","http://127.0.0.1:5174"]);app.register(cors,{origin:allowed,credentials:true});app.register(helmet);app.register(rateLimit,{max:120,timeWindow:"1 minute"});app.get("/health",async()=>({status:"ok",service:"todo-api",timestamp:new Date().toISOString()}));app.get("/ready",async(_req,reply)=>{try{await checkDatabase();return {status:"ready"};}catch{return reply.code(503).send({status:"not_ready"});}});registerAuthRoutes(app);registerTaskRoutes(app);registerProjectRoutes(app);registerLabelRoutes(app);registerSearchRoutes(app);registerResourceRoutes(app);registerSyncRoutes(app);registerApiTokenRoutes(app);return app;}
const entrypoint=process.argv[1];
if(entrypoint&&pathToFileURL(resolve(entrypoint)).href===import.meta.url){buildServer().listen({host:"0.0.0.0",port:Number(process.env.PORT??3000)}).catch(e=>{console.error("API startup failed",e);process.exit(1);});}