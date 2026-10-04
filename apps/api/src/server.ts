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
import {registerSectionRoutes} from "./section-routes";
import {registerLabelRoutes} from "./label-routes";
import {registerSearchRoutes} from "./search-routes";
import {registerResourceRoutes} from "./resource-routes";
import {registerSyncRoutes} from "./sync-routes";
import {registerApiTokenRoutes} from "./api-token-routes";

function isPrivateIpv4(hostname:string){
  const parts=hostname.split(".").map(Number);
  if(parts.length!==4||parts.some(x=>!Number.isInteger(x)||x<0||x>255))return false;
  const [a,b]=parts;
  return a===10||a===127||(a===192&&b===168)||(a===172&&b>=16&&b<=31);
}
function corsOrigin(){
  const configured=process.env.CORS_ORIGIN?.split(",").map(x=>x.trim()).filter(Boolean)??[];
  if(process.env.NODE_ENV!=="production"){
    return (origin:string|undefined)=>{
      if(!origin)return true;
      try{
        const url=new URL(origin);
        const localHost=url.hostname==="localhost"||url.hostname==="127.0.0.1"||isPrivateIpv4(url.hostname);
        if(localHost&&(url.protocol==="http:"||url.protocol==="https:"))return true;
      }catch{}
      return configured.includes(origin);
    };
  }
  return configured;
}

export function buildServer(){
  const app=Fastify({logger:true,bodyLimit:Number(process.env.REQUEST_BODY_LIMIT??1048576)});
  app.register(cors,{origin:corsOrigin(),credentials:true});
  app.register(helmet);
  app.register(rateLimit,{max:120,timeWindow:"1 minute"});
  app.get("/",async()=>({service:"todo-api",status:"ok",health:"/health"}));
  app.get("/health",async()=>({status:"ok",service:"todo-api",timestamp:new Date().toISOString()}));
  app.get("/ready",async(_req,reply)=>{try{await checkDatabase();return {status:"ready"};}catch{return reply.code(503).send({status:"not_ready"});}});
  registerAuthRoutes(app);
  registerTaskRoutes(app);
  registerProjectRoutes(app);
  registerSectionRoutes(app);
  registerLabelRoutes(app);
  registerSearchRoutes(app);
  registerResourceRoutes(app);
  registerSyncRoutes(app);
  registerApiTokenRoutes(app);
  return app;
}
const entrypoint=process.argv[1];
if(entrypoint&&pathToFileURL(resolve(entrypoint)).href===import.meta.url){
  buildServer().listen({host:"0.0.0.0",port:Number(process.env.PORT??3000)}).catch(e=>{console.error("API startup failed",e);process.exit(1);});
}