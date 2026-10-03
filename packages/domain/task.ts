export const TASK_PRIORITIES = ["P1", "P2", "P3", "P4"] as const;
export type TaskPriority = typeof TASK_PRIORITIES[number];

export const TASK_STATUSES = ["active", "completed", "deleted"] as const;
export type TaskStatus = typeof TASK_STATUSES[number];

export interface Task {
  id: string;
  userId: string;
  parentTaskId: string | null;
  projectId: string | null;
  sectionId: string | null;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueAt: string | null;
  deadlineAt: string | null;
  durationMinutes: number | null;
  recurrence: string | null;
  position: string;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  deletedAt: string | null;
}

export interface CreateTaskInput {
  userId: string;
  title: string;
  description?: string;
  parentTaskId?: string | null;
  projectId?: string | null;
  sectionId?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  deadlineAt?: string | null;
  durationMinutes?: number | null;
  recurrence?: string | null;
  position?: string;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  parentTaskId?: string | null;
  projectId?: string | null;
  sectionId?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  deadlineAt?: string | null;
  durationMinutes?: number | null;
  recurrence?: string | null;
  position?: string;
}

export function validateTaskTitle(title: string): string {
  const value = title.trim();
  if (!value) throw new Error("Task title cannot be empty");
  if (value.length > 500) throw new Error("Task title cannot exceed 500 characters");
  return value;
}

export function validateDuration(minutes: number | null | undefined): void {
  if (minutes == null) return;
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 24 * 60) {
    throw new Error("Task duration must be a whole number between 0 and 1440 minutes");
  }
}

export function validateTaskInput(input: CreateTaskInput | UpdateTaskInput): void {
  if (input.title !== undefined) validateTaskTitle(input.title);
  validateDuration(input.durationMinutes);
  if (input.dueAt && Number.isNaN(Date.parse(input.dueAt))) throw new Error("Invalid due date/time");
  if (input.deadlineAt && Number.isNaN(Date.parse(input.deadlineAt))) throw new Error("Invalid deadline");
}
