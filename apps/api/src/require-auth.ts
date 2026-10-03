import type {FastifyRequest} from "fastify";
import {authenticate} from "./auth";
export async function requireUser(request:FastifyRequest){return authenticate(request.headers.authorization);}