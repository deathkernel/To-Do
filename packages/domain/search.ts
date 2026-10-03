import type { Task } from "./task";

export interface SearchQuery {
  text?: string;
  priority?: 1 | 2 | 3 | 4;
  status?: "active" | "completed" | "deleted";
  projectId?: string;
}

export function searchTasks(tasks: Task[], query: SearchQuery): Task[] {
  const text = query.text?.trim().toLowerCase();
  return tasks.filter((task) => {
    if (text && !task.title.toLowerCase().includes(text)) return false;
    if (query.priority !== undefined && task.priority !== query.priority) return false;
    if (query.status !== undefined && task.status !== query.status) return false;
    if (query.projectId !== undefined && task.projectId !== query.projectId) return false;
    return true;
  });
}
