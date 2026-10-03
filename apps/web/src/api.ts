export interface ApiTask {
  id: string;
  title: string;
  status: string;
}

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export async function listTasks(userId: string): Promise<ApiTask[]> {
  const response = await fetch(`${API_URL}/api/v1/tasks?userId=${encodeURIComponent(userId)}`);
  if (!response.ok) throw new Error("Failed to load tasks");
  return response.json();
}

export async function createTask(userId: string, title: string): Promise<ApiTask> {
  const response = await fetch(`${API_URL}/api/v1/tasks`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userId, title })
  });
  if (!response.ok) throw new Error("Failed to create task");
  return response.json();
}
