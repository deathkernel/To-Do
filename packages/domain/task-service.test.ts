import { describe, expect, it } from "vitest";
import { Task, CreateTaskInput } from "./task.js";
import { TaskRepository, TaskService } from "./task-service.js";

class MemoryTaskRepository implements TaskRepository {
  private tasks = new Map<string, Task>();
  async create(task: Task) { this.tasks.set(task.id, task); return task; }
  async findById(userId: string, taskId: string) { const task = this.tasks.get(taskId); return task?.userId === userId ? task : null; }
  async update(userId: string, taskId: string, patch: Partial<Task>) {
    const current = await this.findById(userId, taskId);
    if (!current) throw new Error("Task not found");
    const next = { ...current, ...patch };
    this.tasks.set(taskId, next);
    return next;
  }
  async list(userId: string) { return [...this.tasks.values()].filter(t => t.userId === userId); }
}

describe("TaskService", () => {
  const input: CreateTaskInput = { userId: "u1", title: "Study biology", priority: "P1" };

  it("creates, completes, reopens and soft-deletes a task", async () => {
    const service = new TaskService(new MemoryTaskRepository(), () => new Date("2026-01-01T10:00:00Z"));
    const task = await service.create(input);
    expect(task.status).toBe("active");
    expect((await service.complete("u1", task.id)).status).toBe("completed");
    expect((await service.reopen("u1", task.id)).status).toBe("active");
    expect((await service.remove("u1", task.id)).status).toBe("deleted");
    expect((await service.restore("u1", task.id)).status).toBe("active");
  });

  it("does not allow cross-user mutation", async () => {
    const repo = new MemoryTaskRepository();
    const service = new TaskService(repo);
    const task = await service.create(input);
    await expect(service.complete("u2", task.id)).rejects.toThrow("Task not found");
  });
});
