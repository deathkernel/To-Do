import {and,eq} from "drizzle-orm";
import {getDb,tasks} from "../index";
import type {Task,TaskPriority,TaskStatus} from "../../../domain/task";
const pToDb=(p:TaskPriority)=>({P1:1,P2:2,P3:3,P4:4}[p]);
const pFromDb=(p:number):TaskPriority=>p<=1?"P1":p===2?"P2":p===3?"P3":"P4";
const map=(r:any):Task=>({...r,priority:pFromDb(r.priority),createdAt:r.createdAt.toISOString(),updatedAt:r.updatedAt.toISOString(),dueAt:r.dueAt?.toISOString()??null,deadlineAt:r.deadlineAt?.toISOString()??null,completedAt:r.completedAt?.toISOString()??null,deletedAt:r.deletedAt?.toISOString()??null,description:r.description??""});
export class PostgresTaskRepository{
 async create(task:Task){const r=await getDb().insert(tasks).values({...task,priority:pToDb(task.priority),dueAt:task.dueAt?new Date(task.dueAt):null,deadlineAt:task.deadlineAt?new Date(task.deadlineAt):null,completedAt:null,deletedAt:null,createdAt:new Date(task.createdAt),updatedAt:new Date(task.updatedAt)}).returning();return map(r[0]);}
 async findById(userId:string,taskId:string){const r=await getDb().select().from(tasks).where(and(eq(tasks.id,taskId),eq(tasks.userId,userId)));return r[0]?map(r[0]):null;}
 async update(userId:string,taskId:string,patch:Partial<Task>){const current=await this.findById(userId,taskId);if(!current)throw new Error("Task not found");const v:any={...patch,updatedAt:new Date()};if(patch.priority)v.priority=pToDb(patch.priority);for(const k of ["dueAt","deadlineAt","completedAt","deletedAt"] as const)if(k in patch)v[k]=patch[k]?new Date(patch[k] as string):null;delete v.id;delete v.userId;const r=await getDb().update(tasks).set(v).where(and(eq(tasks.id,taskId),eq(tasks.userId,userId))).returning();return map(r[0]);}
 async list(userId:string,includeDeleted=false){const rows=await getDb().select().from(tasks).where(eq(tasks.userId,userId));return rows.filter(r=>includeDeleted||r.status!=="deleted").map(map);}
}