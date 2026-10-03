export interface ApiTask {
  id: string;
  title: string;
  status: "active" | "completed" | "deleted";
  priority: 1 | 2 | 3 | 4;
  dueAt?: string;
}
export interface ApiProject { id: string; name: string; favorite: boolean; archived: boolean; }
export interface ApiLabel { id: string; name: string; color: string; }

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) }
  });
  if (!response.ok) throw new Error((await response.json().catch(() => null))?.error ?? "Request failed");
  return response.status === 204 ? (undefined as T) : response.json();
}
export const listTasks = (userId: string) => request<ApiTask[]>(`/api/v1/tasks?userId=${encodeURIComponent(userId)}`);
export const createTask = (userId: string, title: string, projectId?: string) => request<ApiTask>("/api/v1/tasks", { method:"POST", body:JSON.stringify({userId,title,projectId}) });
export const completeTask = (userId: string, id: string) => request<ApiTask>(`/api/v1/tasks/${id}/complete`, {method:"POST",body:JSON.stringify({userId})});
export const reopenTask = (userId: string, id: string) => request<ApiTask>(`/api/v1/tasks/${id}/reopen`, {method:"POST",body:JSON.stringify({userId})});
export const deleteTask = (userId: string, id: string) => request<void>(`/api/v1/tasks/${id}?userId=${encodeURIComponent(userId)}`, {method:"DELETE"});
export const listProjects = (userId: string) => request<ApiProject[]>(`/api/v1/projects?userId=${encodeURIComponent(userId)}`);
export const createProject = (userId: string, name: string) => request<ApiProject>("/api/v1/projects", {method:"POST",body:JSON.stringify({userId,name})});
export const listLabels = (userId: string) => request<ApiLabel[]>(`/api/v1/labels?userId=${encodeURIComponent(userId)}`);
