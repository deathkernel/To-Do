import type {Reminder} from "./reminder";
export interface ReminderScheduler{schedule(reminder:Reminder):Promise<void>;cancel(id:string):Promise<void>;}
export function dueReminders(reminders:Reminder[],now=new Date()){return reminders.filter(r=>r.enabled&&r.triggerAt&&new Date(r.triggerAt)<=now);}