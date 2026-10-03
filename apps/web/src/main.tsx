import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { completeTask, createTask, deleteTask, listTasks, reopenTask, type ApiTask } from "./api";
import "./styles.css";

const USER_ID = "local-user";

function App() {
  const [tasks, setTasks] = useState<ApiTask[]>([]);
  const [title, setTitle] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    try { setTasks(await listTasks(USER_ID)); setError(""); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load tasks"); }
  }

  useEffect(() => { void refresh(); }, []);

  async function addTask() {
    if (!title.trim()) return;
    try { await createTask(USER_ID, title.trim()); setTitle(""); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to create task"); }
  }

  async function toggle(task: ApiTask) {
    try {
      if (task.status === "completed") await reopenTask(USER_ID, task.id);
      else await completeTask(USER_ID, task.id);
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update task"); }
  }

  async function remove(id: string) {
    try { await deleteTask(USER_ID, id); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to delete task"); }
  }

  const visible = tasks.filter((task) => showCompleted || task.status !== "completed");

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <strong>To-Do</strong>
        <nav aria-label="Primary">
          <button>Inbox</button>
          <button>Today</button>
          <button>Upcoming</button>
          <button>Projects</button>
        </nav>
      </aside>
      <section className="content">
        <header><h1>Inbox</h1><button onClick={() => setShowCompleted(!showCompleted)}>Completed</button></header>
        <form className="quick-add" onSubmit={(e) => { e.preventDefault(); void addTask(); }}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add a task…" aria-label="Task title" />
          <button className="primary" type="submit">Add task</button>
        </form>
        {error && <p role="alert">{error}</p>}
        <section className="task-list" aria-label="Tasks">
          {visible.length === 0 ? <p className="empty">No tasks yet.</p> : visible.map((task) => (
            <article className={`task ${task.status === "completed" ? "done" : ""}`} key={task.id}>
              <button className="check" onClick={() => void toggle(task)} aria-label={task.status === "completed" ? "Reopen task" : "Complete task"}>✓</button>
              <span>{task.title}</span>
              <small>P{task.priority}</small>
              <button className="delete" onClick={() => void remove(task.id)} aria-label="Delete task">×</button>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<StrictMode><App /></StrictMode>);
