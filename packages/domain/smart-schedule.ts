import {validateTimeZone,validateDurationMinutes} from "./scheduling";
import type {Task} from "./task";
export function scheduleTasks(tasks:Task,availableMinutes:number){validateDurationMinutes(tasks.durationMinutes);if((tasks.durationMinutes??0)>availableMinutes)throw new Error("Task does not fit available capacity");return {...tasks,dueAt:tasks.dueAt??new Date().toISOString()};}
export function validateScheduleTimezone(timeZone:string){validateTimeZone(timeZone);return timeZone;}