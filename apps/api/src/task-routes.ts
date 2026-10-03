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

  app.patch("/api/v1/tasks/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { userId: string; title?: string; priority?: 1|2|3|4; dueAt?: string };
    try {
      const task = await service.update(params.id, body.userId, {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt } : {})
      });
      return reply.send(task);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid task update" });
    }
  });

  app.post("/api/v1/tasks/:id/complete", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { userId: string };
    try {
      return reply.send(await service.complete(params.id, body.userId));
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to complete task" });
    }
  });

  app.post("/api/v1/tasks/:id/reopen", async (request, reply) => {
    const params = request.params as { id: string };
    const body = request.body as { userId: string };
    try {
      return reply.send(await service.reopen(params.id, body.userId));
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to reopen task" });
    }
  });

  app.delete("/api/v1/tasks/:id", async (request, reply) => {
    const params = request.params as { id: string };
    const query = request.query as { userId?: string };
    try {
      await service.remove(params.id, query.userId ?? "");
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to delete task" });
    }
  });
}
