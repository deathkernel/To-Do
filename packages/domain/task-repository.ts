import type {Task} from "./task";
export interface TaskRepository{
 create(task:Task):Promise<Task>;
 getById(id:string,userId:string):Promise<Task|undefined>;
 list(userId:string,includeDeleted?:boolean):Promise<Task[]>;
 save(task:Task):Promise<Task>;
 delete(id:string,userId:string):Promise<void>;
}
export class InMemoryTaskRepository implements TaskRepository{
 private readonly tasks=new Map<string,Task>();
 async create(task:Task){this.tasks.set(task.id,task);return task}
 async getById(id:string,userId:string){const t=this.tasks.get(id);return t?.userId===userId?t:undefined}
 async list(userId:string,includeDeleted=false){return [...this.tasks.values()].filter(t=>t.userId===userId&&(includeDeleted||t.status!=="deleted"))}
 async save(task:Task){this.tasks.set(task.id,task);return task}
 async delete(id:string,userId:string){const t=await this.getById(id,userId);if(t)this.tasks.delete(id)}
}