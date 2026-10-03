import type {ApiTask} from "./api";

function priorityClass(priority:ApiTask["priority"]){return priority.toLowerCase();}

export function TaskRow({task,onToggle,onDelete}:{task:ApiTask;onToggle:()=>void;onDelete:()=>void}){
  return <article className={"task-row "+(task.status==="completed"?"done":"")}>
    <button className={"task-check "+priorityClass(task.priority)} onClick={onToggle} aria-label={task.status==="completed"?"Reopen task":"Complete task"}>{task.status==="completed"?"✓":""}</button>
    <div className="task-main">
      <span className="task-title">{task.title}</span>
      <div className="task-meta">
        <span className={"priority "+priorityClass(task.priority)}>{task.priority}</span>
        {task.dueAt&&<span>◷ {new Date(task.dueAt).toLocaleString([], {month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span>}
      </div>
    </div>
    <div className="task-actions"><button className="task-menu" aria-label="Task options">•••</button><button className="delete-task" onClick={onDelete} aria-label="Delete task">×</button></div>
  </article>;
}
