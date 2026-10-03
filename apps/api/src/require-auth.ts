import type {FastifyRequest} from "fastify";
import {authenticate} from "./auth";
export async function requireUser(request:FastifyRequest){return authenticate(request.headers.authorization);}
export function hasScope(user:{authType:"session"|"api-token";scopes:string[]|null},scope:string){return user.authType==="session"||user.scopes===null||user.scopes.includes(scope);}
export async function requireScope(request:FastifyRequest,scope:string){const user=await requireUser(request);if(!hasScope(user,scope))throw new Error("API token lacks required scope: "+scope);return user;}