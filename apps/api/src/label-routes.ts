import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { InMemoryLabelRepository } from "../../../packages/domain/label-repository";

export function registerLabelRoutes(app: FastifyInstance) {
  const repository = new InMemoryLabelRepository();

  app.get("/api/v1/labels", async (request) => {
    const query = request.query as { userId?: string };
    return repository.list(query.userId ?? "");
  });

  app.post("/api/v1/labels", async (request, reply) => {
    const body = request.body as { userId: string; name: string; color?: string };
    if (!body.userId || !body.name?.trim()) return reply.code(400).send({ error: "userId and name are required" });
    return reply.code(201).send(await repository.create({
      id: randomUUID(),
      userId: body.userId,
      name: body.name.trim(),
      color: body.color ?? "",
      description: "",
      favorite: false
    }));
  });
}
