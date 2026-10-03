import type {FastifyInstance} from "fastify";
import {searchTasks,type SearchQuery} from "../../../packages/domain/search";
import {PostgresTaskRepository} from "../../../packages/db/src/task-repository";
import {authenticated} from "./middleware";
export function registerSearchRoutes(app:FastifyInstance){const repository=new PostgresTaskRepository();app.get("/api/v1/search/tasks",async(request,reply)=>{const user=await authenticated(request,reply);if(!user)return;const query=request.query as SearchQuery;const tasks=await repository.list(user.id);return searchTasks(tasks,query);});}