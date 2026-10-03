export type JobName="send_reminder"|"run_automation"|"sync_push"|"send_notification"|"generate_backup";
export interface Job<T=unknown>{id:string;name:JobName;payload:T;attempts:number;runAt:string;createdAt:string;}
export interface JobQueue{enqueue<T>(name:JobName,payload:T,runAt?:Date):Promise<Job<T>>;dequeue():Promise<Job|null>;ack(id:string):Promise<void>;fail(id:string,error:string):Promise<void>;}
export class InMemoryJobQueue implements JobQueue{
 private jobs:Job[]=[];
 async enqueue<T>(name:JobName,payload:T,runAt=new Date()):Promise<Job<T>>{const j:Job<T>={id:crypto.randomUUID(),name,payload,attempts:0,runAt:runAt.toISOString(),createdAt:new Date().toISOString()};this.jobs.push(j as Job);return j;}
 async dequeue():Promise<Job|null>{const now=Date.now();const i=this.jobs.findIndex(j=>new Date(j.runAt).getTime()<=now);if(i<0)return null;const j=this.jobs.splice(i,1)[0];if(!j)return null;j.attempts++;return j;}
 async ack(_id:string){}
 async fail(id:string,_error:string){const j=this.jobs.find(x=>x.id===id);if(j){j.runAt=new Date(Date.now()+Math.min(300000,1000*2**j.attempts)).toISOString();j.attempts++;}}
}