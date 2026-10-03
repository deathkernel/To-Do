import { describe, expect, it } from "vitest";
import { buildServer } from "./server";

describe("task API", () => {
  it("creates and lists tasks", async () => {
    const app = buildServer();
    const create = await app.inject({
      method: "POST",
      url: "/api/v1/tasks",
      payload: { userId: "u1", title: "Build To-Do" }
    });
    expect(create.statusCode).toBe(201);
    expect(create.json().title).toBe("Build To-Do");

    const list = await app.inject({
      method: "GET",
      url: "/api/v1/tasks?userId=u1"
    });
    expect(list.statusCode).toBe(200);
    expect(list.json()).toHaveLength(1);
    await app.close();
  });
});
