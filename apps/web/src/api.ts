export interface ApiTask{id:string;title:string;status:"active"|"completed"|"deleted";priority:"P1"|"P2"|"P3"|"P4";dueAt?:string|null;}
export interface ApiProject{id:string;name:string;favorite:boolean;archived:boolean;}
export interface ApiLabel{id:string;name:string;color?:string|null;}
const API_URL=import.meta.env.VITE_API_URL??"http://localhost:3000";
const token=()=>localStorage.getItem("todo_access_token");
async function request<T>(path:string,init:RequestInit={}):Promise<T>{const headers=new Headers(init.headers);headers.set("content-type","application/json");const t=token();if(t)headers.set("authorization","Bearer "+t);const response=await fetch(API_URL+path,{...init,headers});if(!response.ok)throw new Error((await response.json().catch(()=>null))?.error??"Request failed");return response.status===204?undefined as T:response.json();}
export const saveAuth=(value:string)=>localStorage.setItem("todo_access_token",value);
export const clearAuth=()=>localStorage.removeItem("todo_access_token");
export const listTasks=()=>request<ApiTask[]>("/api/v1/tasks");
export const createTask=(title:string,projectId?:string)=>request<ApiTask>("/api/v1/tasks",{method:"POST",body:JSON.stringify({title,projectId})});
export const completeTask=(id:string)=>request<ApiTask>("/api/v1/tasks/"+id+"/complete",{method:"POST"});
export const reopenTask=(id:string)=>request<ApiTask>("/api/v1/tasks/"+id+"/reopen",{method:"POST"});
export const deleteTask=(id:string)=>request<void>("/api/v1/tasks/"+id,{method:"DELETE"});
export const listProjects=()=>request<ApiProject[]>("/api/v1/projects");
export const createProject=(name:string)=>request<ApiProject>("/api/v1/projects",{method:"POST",body:JSON.stringify({name})});
export const listLabels=()=>request<ApiLabel[]>("/api/v1/labels");
