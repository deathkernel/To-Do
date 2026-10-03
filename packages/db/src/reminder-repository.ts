import {and,eq,lte} from "drizzle-orm";import {getDb,reminders} from "./index";
export async function createReminder(row:any){const r=await getDb().insert(reminders).values(row).returning();return r[0];}
export async function listReminders(userId:string){return getDb().select().from(reminders).where(eq(reminders.userId,userId));}
export async function dueRemindersForUser(userId:string,now=new Date()){return getDb().select().from(reminders).where(and(eq(reminders.userId,userId),eq(reminders.enabled,true),lte(reminders.triggerAt,now)));}