import Fastify from "fastify";
import cors from "@fastify/cors";

export function buildServer() {
  const app = Fastify({ logger: true });

  app.register(cors, { origin: true });

  app.get("/health", async () => ({
    status: "ok",
    service: "todo-api",
    timestamp: new Date().toISOString()
  }));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const app = buildServer();
  app.listen({ host: "0.0.0.0", port: Number(process.env.PORT ?? 3000) })
    .catch((error) => {
      app.log.error(error);
      process.exit(1);
    });
}
