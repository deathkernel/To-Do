import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("API server", () => {
  it("exposes a health endpoint", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(response.json().status).toBe("ok");
    await app.close();
  });
});
