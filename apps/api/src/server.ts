import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { registerAuthRoutes } from "./auth-routes";
import { registerTaskRoutes } from "./task-routes";
import { registerProjectRoutes } from "./project-routes";
import { registerLabelRoutes } from "./label-routes";
import { registerSearchRoutes } from "./search-routes";

export function buildServer() {
  const app=Fastify({logger:true});
  app.register(cors,{origin:true});
  app.register(helmet);
  app.register(rateLimit,{max:120,timeWindow:"1 minute"});

  app.get("/health",async()=>({status:"ok",service:"todo-api",timestamp:new Date().toISOString()}));
  registerAuthRoutes(app);
  registerTaskRoutes(app);
  registerProjectRoutes(app);
  registerLabelRoutes(app);
  registerSearchRoutes(app);
  return app;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const app=buildServer();
  app.listen({host:"0.0.0.0",port:Number(process.env.PORT??3000)}).catch(error=>{app.log.error(error);process.exit(1);});
}