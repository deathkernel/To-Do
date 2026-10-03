import {and,eq,lte} from "drizzle-orm";
import {getDb,reminders,tasks} from "./index";
export async function createReminder(row:any){if(!row.userId||!row.taskId)throw new Error("Reminder user and task are required");const t=await getDb().select({id:tasks.id}).from(tasks).where(and(eq(tasks.id,row.taskId),eq(tasks.userId,row.userId)));if(!t[0])throw new Error("Task not found");const r=await getDb().insert(reminders).values(row).returning();return r[0];}
export async function listReminders(userId:string){return getDb().select().from(reminders).where(eq(reminders.userId,userId));}
export async function dueRemindersForUser(userId:string,now=new Date()){return getDb().select().from(reminders).where(and(eq(reminders.userId,userId),eq(reminders.enabled,true),lte(reminders.triggerAt,now)));}