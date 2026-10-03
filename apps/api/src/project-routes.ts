import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { InMemoryProjectRepository } from "../../../packages/domain/project-repository";

export function registerProjectRoutes(app: FastifyInstance) {
  const repository = new InMemoryProjectRepository();

  app.get("/api/v1/projects", async (request) => {
    const query = request.query as { userId?: string };
    return repository.listProjects(query.userId ?? "");
  });

  app.post("/api/v1/projects", async (request, reply) => {
    const body = request.body as { userId: string; name: string };
    if (!body.userId || !body.name?.trim()) return reply.code(400).send({ error: "userId and name are required" });

    const project = {
      id: randomUUID(),
      userId: body.userId,
      name: body.name.trim(),
      description: "",
      color: "",
      icon: "",
      favorite: false,
      archived: false,
      position: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return reply.code(201).send(await repository.createProject(project));
  });
}
