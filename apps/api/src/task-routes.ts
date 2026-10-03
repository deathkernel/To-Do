import type { FastifyInstance } from "fastify";
import { TaskService } from "../../../packages/domain/task-service";
import { InMemoryTaskRepository } from "../../../packages/domain/task-repository";

export function registerTaskRoutes(app: FastifyInstance) {
  const repository = new InMemoryTaskRepository();
  const service = new TaskService(repository);

  app.post("/api/v1/tasks", async (request, reply) => {
    const body = request.body as { userId: string; title: string; projectId?: string };
    try {
      const task = await service.create({
        userId: body.userId,
        title: body.title,
        projectId: body.projectId
      });
      return reply.code(201).send(task);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid task" });
    }
  });

  app.get("/api/v1/tasks", async (request) => {
    const query = request.query as { userId?: string };
    return service.list(query.userId ?? "");
  });
}
