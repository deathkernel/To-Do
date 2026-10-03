import {StrictMode,useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {clearAuth,completeTask,createProject,createTask,listLabels,listProjects,listTasks,reopenTask,deleteTask,saveAuth} from "./api";
import {login,register} from "./auth-api";
import {TaskRow} from "./components";
import {useLocalState} from "./hooks";
import "./styles.css";

type View="inbox"|"today"|"upcoming"|"completed"|"projects"|"goals"|"reminders"|"automations"|"settings";
const NAV:[View,string,string][]=[
  ["inbox","Inbox","⌂"],["today","Today","◷"],["upcoming","Upcoming","▤"],["completed","Completed","✓"]
];

function AuthScreen({onAuth}:{onAuth:()=>void}){
  const [mode,setMode]=useState<"login"|"register">("login");
  const [email,setEmail]=useState(""),[password,setPassword]=useState(""),[name,setName]=useState(""),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  async function submit(e:React.FormEvent){
    e.preventDefault();setBusy(true);setError("");
    try{const r=mode==="login"?await login(email,password):await register(email,password,name);saveAuth(r.token);onAuth();}
    catch(x){setError(x instanceof Error?x.message:"Authentication failed")}finally{setBusy(false)}
  }
  return <main className="auth-shell">
    <section className="auth-visual">
      <div className="hero-badge">TO-DO / PRODUCTIVITY</div>
      <h1>Make space for<br/><em>what matters.</em></h1>
      <p>A focused workspace for planning, organizing and finishing the things that move your day forward.</p>
      <div className="hero-orbit"><span>✓</span><span>◷</span><span>+</span></div>
    </section>
    <form className="auth-card" onSubmit={submit}>
      <div className="brand-mark"><span>✓</span><strong>To-Do</strong></div>
      <div className="auth-copy"><h2>{mode==="login"?"Welcome back":"Create your workspace"}</h2><p>{mode==="login"?"Sign in to continue where you left off.":"Start with a clean space for your tasks."}</p></div>
      {mode==="register"&&<label><span>Display name</span><input required value={name} onChange={e=>setName(e.target.value)} placeholder="Your name"/></label>}
      <label><span>Email</span><input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/></label>
      <label><span>Password</span><input required minLength={10} type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 10 characters"/></label>
      {error&&<div className="error">{error}</div>}
      <button className="primary wide" disabled={busy}>{busy?"Please wait…":mode==="login"?"Sign in":"Create account"}</button>
      <button className="auth-switch" type="button" onClick={()=>setMode(mode==="login"?"register":"login")}>{mode==="login"?"Need an account? Create one":"Already have an account? Sign in"}</button>
    </form>
  </main>;
}

function App(){
  const [authenticated,setAuthenticated]=useState(()=>!!localStorage.getItem("todo_access_token"));
  const [tasks,setTasks]=useState<any[]>([]),[projects,setProjects]=useState<any[]>([]),[labels,setLabels]=useState<any[]>([]);
  const [title,setTitle]=useState(""),[projectName,setProjectName]=useState(""),[search,setSearch]=useState("");
  const [view,setView]=useState<View>("inbox"),[selectedProject,setSelectedProject]=useState(""),[error,setError]=useState("");
  const [dark,setDark]=useLocalState("todo-theme",false);
  const [showComposer,setShowComposer]=useState(false);

  async function refresh(){
    try{const [t,p,l]=await Promise.all([listTasks(),listProjects(),listLabels()]);setTasks(t);setProjects(p);setLabels(l);setError("")}
    catch(e){const message=e instanceof Error?e.message:"Unable to load data";if(message.toLowerCase().includes("authentication")||message.toLowerCase().includes("session")){clearAuth();setAuthenticated(false);return}setError(message)}
  }
  useEffect(()=>{if(!authenticated)return;void refresh();if("serviceWorker"in navigator)navigator.serviceWorker.register("/sw.js").catch(()=>{})},[authenticated]);

  async function addTask(){
    if(!title.trim())return;
    try{await createTask(title.trim(),view==="projects"?selectedProject:undefined);setTitle("");setShowComposer(false);await refresh()}
    catch(e){setError(e instanceof Error?e.message:"Unable to create task")}
  }
  async function addProject(){
    if(!projectName.trim())return;
    try{await createProject(projectName.trim());setProjectName("");await refresh()}
    catch(e){setError(e instanceof Error?e.message:"Unable to create project")}
  }

  const today=new Date();today.setHours(0,0,0,0);
  const tomorrow=new Date(today);tomorrow.setDate(tomorrow.getDate()+1);
  const visible=useMemo(()=>tasks.filter(t=>{
    if(search&&!t.title.toLowerCase().includes(search.toLowerCase()))return false;
    if(view==="completed")return t.status==="completed";
    if(view==="today")return !!t.dueAt&&new Date(t.dueAt)>=today&&new Date(t.dueAt)<tomorrow&&t.status!=="completed";
    if(view==="upcoming")return !!t.dueAt&&new Date(t.dueAt)>=tomorrow&&t.status!=="completed";
    if(view==="projects"&&selectedProject)return t.projectId===selectedProject&&t.status!=="completed";
    return t.status!=="completed";
  }),[tasks,search,view,selectedProject]);
  const active=tasks.filter(t=>t.status!=="completed").length,done=tasks.filter(t=>t.status==="completed").length;

  if(!authenticated)return <AuthScreen onAuth={()=>setAuthenticated(true)}/>;

  const currentTitle=view==="projects"&&selectedProject?(projects.find(p=>p.id===selectedProject)?.name??"Project"):view==="inbox"?"Inbox":view[0].toUpperCase()+view.slice(1);
  const go=(v:View)=>{setView(v);if(v!=="projects")setSelectedProject("")};

  return <div className={dark?"app-shell dark":"app-shell"}>
    <aside className="sidebar">
      <div className="brand"><span className="brand-dot">✓</span><strong>To-Do</strong><span className="brand-pill">PRO</span></div>
      <button className="add-task-btn" onClick={()=>setShowComposer(true)}><span>＋</span> Add task <kbd>C</kbd></button>
      <div className="search-wrap"><span>⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search"/></div>

      <nav className="main-nav">{NAV.map(([v,label,icon])=><button key={v} className={view===v?"active":""} onClick={()=>go(v)}><span className="nav-icon">{icon}</span><span>{label}</span>{v==="inbox"&&active>0&&<b>{active}</b>}</button>)}</nav>

      <div className="sidebar-block">
        <div className="sidebar-heading"><span>Projects</span><button aria-label="Add project" onClick={()=>document.getElementById("new-project")?.focus()}>＋</button></div>
        <div className="project-list">
          {projects.map(p=><button className={view==="projects"&&selectedProject===p.id?"project-item active":"project-item"} key={p.id} onClick={()=>{setSelectedProject(p.id);setView("projects")}}><span className="project-dot"/><span>{p.name}</span></button>)}
        </div>
        <form className="inline-project" onSubmit={e=>{e.preventDefault();void addProject()}}><input id="new-project" value={projectName} onChange={e=>setProjectName(e.target.value)} placeholder="New project…"/></form>
      </div>

      <div className="sidebar-block">
        <div className="sidebar-heading"><span>Labels</span></div>
        <div className="label-list">{labels.slice(0,6).map(l=><span className="label-chip" key={l.id}>#{l.name}</span>)}{labels.length>6&&<span className="label-chip muted">+{labels.length-6}</span>}</div>
      </div>

      <div className="sidebar-spacer"/>
      <div className="sidebar-tools">
        <button onClick={()=>go("goals")}>◌ <span>Goals</span></button>
        <button onClick={()=>go("reminders")}>◉ <span>Reminders</span></button>
        <button onClick={()=>go("automations")}>◇ <span>Automations</span></button>
        <button onClick={()=>go("settings")}>⚙ <span>Settings</span></button>
      </div>
      <div className="sidebar-footer">
        <button onClick={()=>setDark(!dark)}>{dark?"☼":"◐"} <span>{dark?"Light mode":"Dark mode"}</span></button>
        <button onClick={()=>{clearAuth();setAuthenticated(false)}}>↪ <span>Sign out</span></button>
      </div>
    </aside>

    <main className="content">
      <header className="topbar">
        <div><div className="eyebrow">MY WORKSPACE <span>•</span> PERSONAL</div><h1>{currentTitle}</h1></div>
        <div className="top-actions"><button className="icon-btn" title="Refresh" onClick={refresh}>↻</button><button className="avatar">T</button></div>
      </header>

      <div className="content-inner">
        {error&&<div className="error-banner"><span>!</span>{error}<button onClick={()=>setError("")}>×</button></div>}

        {["inbox","today","upcoming","completed","projects"].includes(view)?<>
          <div className="overview">
            <div><p className="muted-line">{view==="today"?"Focus on what is due today.":view==="upcoming"?"Plan ahead without losing the big picture.":view==="completed"?"Your finished work, all in one place.":"A calm place to capture and finish your work."}</p>
              <div className="stat-inline"><span><b>{active}</b> active</span><span><b>{done}</b> completed</span><span><b>{projects.length}</b> projects</span></div>
            </div>
            <button className="primary add-inline" onClick={()=>setShowComposer(true)}>＋ New task</button>
          </div>

          {showComposer&&<form className="composer" onSubmit={e=>{e.preventDefault();void addTask()}}>
            <span className="composer-check">○</span><input autoFocus value={title} onChange={e=>setTitle(e.target.value)} placeholder="Task name…"/><button type="button" className="ghost" onClick={()=>setShowComposer(false)}>Esc</button><button className="primary">Add</button>
          </form>}

          <div className="section-caption"><span>{visible.length} {visible.length===1?"task":"tasks"}</span><span className="view-hint">⌘ K &nbsp; search</span></div>
          <section className="task-list">
            {visible.length?visible.map(t=><TaskRow key={t.id} task={t} onToggle={()=>void (t.status==="completed"?reopenTask(t.id):completeTask(t.id)).then(refresh)} onDelete={()=>void deleteTask(t.id).then(refresh)}/>):<div className="empty-state"><div className="empty-icon">✓</div><h3>{view==="completed"?"Nothing completed yet":"You’re all caught up"}</h3><p>{view==="completed"?"Finish a task and it will appear here.":"Add a task and turn a blank page into progress."}</p><button className="secondary" onClick={()=>setShowComposer(true)}>＋ Add your first task</button></div>}
          </section>
        </>:<section className="module-card"><div className="module-icon">{view==="goals"?"◎":view==="reminders"?"◷":view==="automations"?"◇":"⚙"}</div><h2>{currentTitle}</h2><p>The foundation and API for this module are in place. The interactive workspace is the next UI layer.</p><button className="secondary" onClick={()=>go("inbox")}>Back to Inbox</button></section>}
      </div>
    </main>
  </div>;
}

createRoot(document.getElementById("root")!).render(<StrictMode><App/></StrictMode>);