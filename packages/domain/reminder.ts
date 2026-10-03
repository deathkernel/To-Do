export type ReminderTrigger = "at"|"before_due"|"location";
export interface Reminder { id:string; userId:string; taskId:string; trigger:ReminderTrigger; triggerAt:string|null; minutesBefore:number|null; locationId:string|null; recurringRule:string|null; enabled:boolean; }
export interface NotificationPreferences { userId:string; email:boolean; push:boolean; desktop:boolean; browser:boolean; quietHoursStart:string|null; quietHoursEnd:string|null; }
