import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import {registerAuthRoutes} from "./auth-routes";
import {registerTaskRoutes} from "./task-routes";
import {registerProjectRoutes} from "./project-routes";
import {registerLabelRoutes} from "./label-routes";
import {registerSearchRoutes} from "./search-routes";
import {registerResourceRoutes} from "./resource-routes";
import {registerSyncRoutes} from "./sync-routes";
import {registerApiTokenRoutes} from "./api-token-routes";
export function buildServer(){const app=Fastify({logger:true});const allowed=process.env.CORS_ORIGIN?.split(",").map(x=>x.trim()).filter(Boolean)??["http://localhost:5173"];app.register(cors,{origin:allowed,credentials:true});app.register(helmet);app.register(rateLimit,{max:120,timeWindow:"1 minute"});app.get("/health",async()=>({status:"ok",service:"todo-api",timestamp:new Date().toISOString()}));registerAuthRoutes(app);registerTaskRoutes(app);registerProjectRoutes(app);registerLabelRoutes(app);registerSearchRoutes(app);registerResourceRoutes(app);registerSyncRoutes(app);registerApiTokenRoutes(app);return app;}
if(import.meta.url===`file://${process.argv[1]}`){buildServer().listen({host:"0.0.0.0",port:Number(process.env.PORT??3000)}).catch(e=>{console.error(e);process.exit(1);});}
