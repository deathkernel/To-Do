import type {FastifyInstance} from "fastify";
import {z} from "zod";
import {searchTasks,type SearchQuery} from "../../../packages/domain/search";
import {PostgresTaskRepository} from "../../../packages/db/src/task-repository";
import {requireScope} from "./require-auth";
const querySchema=z.object({text:z.string().optional(),priority:z.coerce.number().int().min(1).max(4).optional(),status:z.enum(["active","completed","deleted"]).optional(),projectId:z.string().uuid().optional()});
export function registerSearchRoutes(app:FastifyInstance){const repository=new PostgresTaskRepository();app.get("/api/v1/search/tasks",async(request,reply)=>{try{const user=await requireScope(request,"tasks:read");const query=querySchema.parse(request.query) as SearchQuery;return searchTasks(await repository.list(user.id),query);}catch(error){return reply.code(error instanceof Error&&error.message.startsWith("API token lacks")?403:400).send({error:error instanceof Error?error.message:"Invalid search"});}});}