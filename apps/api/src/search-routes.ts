import type { FastifyInstance } from "fastify";
import { searchTasks, type SearchQuery } from "../../../packages/domain/search";
import { InMemoryTaskRepository } from "../../../packages/domain/task-repository";

export function registerSearchRoutes(app: FastifyInstance) {
  const repository = new InMemoryTaskRepository();

  app.get("/api/v1/search/tasks", async (request) => {
    const query = request.query as SearchQuery & { userId?: string };
    const tasks = await repository.list(query.userId ?? "");
    return searchTasks(tasks, query);
  });
}
