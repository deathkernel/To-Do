import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { completeTask, createProject, createTask, deleteTask, listLabels, listProjects, listTasks, reopenTask, type ApiLabel, type ApiProject, type ApiTask } from "./api";
import "./styles.css";

const USER_ID = "local-user";

function App() {
  const [tasks,setTasks]=useState<ApiTask[]>([]);
  const [projects,setProjects]=useState<ApiProject[]>([]);
  const [labels,setLabels]=useState<ApiLabel[]>([]);
  const [title,setTitle]=useState("");
  const [projectName,setProjectName]=useState("");
  const [showCompleted,setShowCompleted]=useState(false);
  const [error,setError]=useState("");

  async function refresh() {
    try {
      const [t,p,l]=await Promise.all([listTasks(USER_ID),listProjects(USER_ID),listLabels(USER_ID)]);
      setTasks(t); setProjects(p); setLabels(l); setError("");
    } catch(e) { setError(e instanceof Error ? e.message : "Unable to load data"); }
  }
  useEffect(()=>{void refresh();},[]);

  async function addTask() {
    if(!title.trim()) return;
    try { await createTask(USER_ID,title.trim()); setTitle(""); await refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Unable to create task");}
  }
  async function addProject() {
    if(!projectName.trim()) return;
    try { await createProject(USER_ID,projectName.trim()); setProjectName(""); await refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Unable to create project");}
  }
  async function toggle(task:ApiTask) {
    try { if(task.status==="completed") await reopenTask(USER_ID,task.id); else await completeTask(USER_ID,task.id); await refresh(); }
    catch(e){setError(e instanceof Error?e.message:"Unable to update task");}
  }
  async function remove(id:string) { try{await deleteTask(USER_ID,id);await refresh();}catch(e){setError(e instanceof Error?e.message:"Unable to delete task");} }

  const visible=tasks.filter(t=>showCompleted||t.status!=="completed");

  return <main className="app-shell">
    <aside className="sidebar">
      <strong>To-Do</strong>
      <nav><button>Inbox</button><button>Today</button><button>Upcoming</button><button>Projects</button></nav>
      <div className="side-section"><strong>Projects</strong>{projects.map(p=><div className="side-item" key={p.id}>{p.name}</div>)}</div>
      <div className="side-section"><strong>Labels</strong>{labels.map(l=><div className="side-item" key={l.id}>#{l.name}</div>)}</div>
    </aside>
    <section className="content">
      <header><h1>Inbox</h1><button onClick={()=>setShowCompleted(!showCompleted)}>{showCompleted?"Hide completed":"Completed"}</button></header>
      <form className="quick-add" onSubmit={e=>{e.preventDefault();void addTask();}}><input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a task…" aria-label="Task title"/><button className="primary" type="submit">Add task</button></form>
      <form className="quick-add" onSubmit={e=>{e.preventDefault();void addProject();}}><input value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="New project…" aria-label="Project name"/><button type="submit">Add project</button></form>
      {error&&<p role="alert">{error}</p>}
      <section className="task-list">{visible.length===0?<p className="empty">No tasks yet.</p>:visible.map(task=><article className={`task ${task.status==="completed"?"done":""}`} key={task.id}><button className="check" onClick={()=>void toggle(task)}>{task.status==="completed"?"↶":"✓"}</button><span>{task.title}</span><small>P{task.priority}</small><button className="delete" onClick={()=>void remove(task.id)}>×</button></article>)}</section>
    </section>
  </main>;
}
createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);
