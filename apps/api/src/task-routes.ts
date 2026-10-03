import type { FastifyInstance } from "fastify";
import { TaskService } from "../../../packages/domain/task-service";
import { PostgresTaskRepository } from "../../../packages/db/src/task-repository";
import { authenticated } from "./middleware";

export function registerTaskRoutes(app: FastifyInstance) {
  const repository = new PostgresTaskRepository();
  const service = new TaskService(repository);

  app.post("/api/v1/tasks", async (request, reply) => {
    const user = await authenticated(request, reply); if (!user) return;
    const body = request.body as { title: string; projectId?: string };
    try {
      const task = await service.create({
        userId: user.id,
        title: body.title,
        projectId: body.projectId
      });
      return reply.code(201).send(task);
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Invalid task" });
    }
  });

  app.get("/api/v1/tasks", async (request, reply) => {
    const user = await authenticated(request, reply); if (!user) return;
    const query = request.query as { userId?: string };
    return service.list(user.id);
  });

  app.patch("/api/v1/tasks/:id", async (request, reply) => {
    const user = await authenticated(request, reply); if (!user) return;
    const params = request.params as { id: string };
    const body = request.body as { title?: string; priority?: "P1"|"P2"|"P3"|"P4"; dueAt?: string };
    try {
      const task = await service.update(user.id, params.id, {
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
    const user = await authenticated(request, reply); if (!user) return;
    const params = request.params as { id: string };
    const body = request.body as {};
    try {
      return reply.send(await service.complete(user.id, params.id));
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to complete task" });
    }
  });

  app.post("/api/v1/tasks/:id/reopen", async (request, reply) => {
    const user = await authenticated(request, reply); if (!user) return;
    const params = request.params as { id: string };
    const body = request.body as { userId: string };
    try {
      return reply.send(await service.reopen(user.id, params.id));
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to reopen task" });
    }
  });

  app.delete("/api/v1/tasks/:id", async (request, reply) => {
    const user = await authenticated(request, reply); if (!user) return;
    const params = request.params as { id: string };
    const query = request.query as { userId?: string };
    try {
      await service.remove(user.id, params.id);
      return reply.code(204).send();
    } catch (error) {
      return reply.code(400).send({ error: error instanceof Error ? error.message : "Unable to delete task" });
    }
  });
}
