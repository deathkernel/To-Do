import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("label API", () => {
  it("keeps labels scoped to the owner", async () => {
    const app = buildServer();
    await app.inject({ method: "POST", url: "/api/v1/labels", payload: { userId: "u1", name: "work" } });
    expect((await app.inject({ method: "GET", url: "/api/v1/labels?userId=u1" })).json()).toHaveLength(1);
    expect((await app.inject({ method: "GET", url: "/api/v1/labels?userId=u2" })).json()).toHaveLength(0);
    await app.close();
  });
});
