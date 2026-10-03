import type {Task} from "./task";
export function overdueTasks(tasks:Task[],now=new Date()){return tasks.filter(t=>t.status==="active"&&t.dueAt&&new Date(t.dueAt)<now)}
export function todayTasks(tasks:Task[],now=new Date()){const start=new Date(now);start.setHours(0,0,0,0);const end=new Date(start);end.setDate(end.getDate()+1);return tasks.filter(t=>t.status==="active"&&t.dueAt&&new Date(t.dueAt)>=start&&new Date(t.dueAt)<end)}
export function scheduleByPriority(tasks:Task[]){return [...tasks].sort((a,b)=>a.priority.localeCompare(b.priority)||a.position.localeCompare(b.position))}