import {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
  validateTaskInput,
  validateTaskTitle,
} from "./task.js";

export interface TaskRepository {
  create(task: Task): Promise<Task>;
  findById(userId: string, taskId: string): Promise<Task | null>;
  update(userId: string, taskId: string, patch: Partial<Task>): Promise<Task>;
  list(userId: string, includeDeleted?: boolean): Promise<Task[]>;
}

export class TaskService {
  constructor(private readonly repository: TaskRepository, private readonly now = () => new Date()) {}

  async create(input: CreateTaskInput): Promise<Task> {
    validateTaskInput(input);
    const now = this.now().toISOString();
    return this.repository.create({
      id: crypto.randomUUID(),
      userId: input.userId,
      parentTaskId: input.parentTaskId ?? null,
      projectId: input.projectId ?? null,
      sectionId: input.sectionId ?? null,
      title: validateTaskTitle(input.title),
      description: input.description ?? "",
      priority: input.priority ?? "P4",
      status: "active",
      dueAt: input.dueAt ?? null,
      deadlineAt: input.deadlineAt ?? null,
      durationMinutes: input.durationMinutes ?? null,
      recurrence: input.recurrence ?? null,
      position: input.position ?? "a0",
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      deletedAt: null,
    });
  }

  async update(userId: string, taskId: string, patch: UpdateTaskInput): Promise<Task> {
    validateTaskInput(patch);
    return this.repository.update(userId, taskId, {
      ...patch,
      ...(patch.title === undefined ? {} : { title: validateTaskTitle(patch.title) }),
      updatedAt: this.now().toISOString(),
    });
  }

  async complete(userId: string, taskId: string): Promise<Task> {
    return this.repository.update(userId, taskId, {
      status: "completed",
      completedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  async reopen(userId: string, taskId: string): Promise<Task> {
    return this.repository.update(userId, taskId, {
      status: "active",
      completedAt: null,
      updatedAt: this.now().toISOString(),
    });
  }

  async remove(userId: string, taskId: string): Promise<Task> {
    return this.repository.update(userId, taskId, {
      status: "deleted",
      deletedAt: this.now().toISOString(),
      updatedAt: this.now().toISOString(),
    });
  }

  async repositoryList(userId: string): Promise<Task[]> {\n    return this.repository.list(userId);\n  }\n\n  async restore(userId: string, taskId: string): Promise<Task> {
    return this.repository.update(userId, taskId, {
      status: "active",
      deletedAt: null,
      updatedAt: this.now().toISOString(),
    });
  }
}
