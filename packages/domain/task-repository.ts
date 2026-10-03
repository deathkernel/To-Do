import type { Task } from "./task";

export interface TaskRepository {
  create(task: Task): Promise<Task>;
  getById(id: string, userId: string): Promise<Task | undefined>;
  list(userId: string): Promise<Task[]>;
  save(task: Task): Promise<Task>;
  delete(id: string, userId: string): Promise<void>;
}

export class InMemoryTaskRepository implements TaskRepository {
  private readonly tasks = new Map<string, Task>();

  async create(task: Task) {
    this.tasks.set(task.id, task);
    return task;
  }

  async getById(id: string, userId: string) {
    const task = this.tasks.get(id);
    return task?.userId === userId ? task : undefined;
  }

  async list(userId: string) {
    return [...this.tasks.values()].filter((task) => task.userId === userId);
  }

  async save(task: Task) {
    this.tasks.set(task.id, task);
    return task;
  }

  async delete(id: string, userId: string) {
    const task = await this.getById(id, userId);
    if (task) this.tasks.delete(id);
  }
}
