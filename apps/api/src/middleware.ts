import type {FastifyReply,FastifyRequest} from "fastify";
import {requireUser} from "./require-auth";
export async function authenticated(request:FastifyRequest,reply:FastifyReply){try{return await requireUser(request);}catch(e){await reply.code(401).send({error:e instanceof Error?e.message:"Authentication required"});return null;}}