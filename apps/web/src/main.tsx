import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

function App() {
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
        <header>
          <h1>Inbox</h1>
          <button className="primary">+ Add task</button>
        </header>
        <section className="task-list" aria-label="Tasks">
          <p className="empty">Your tasks will appear here.</p>
        </section>
      </section>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode><App /></StrictMode>
);
