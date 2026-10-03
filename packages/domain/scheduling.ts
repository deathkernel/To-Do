export interface Schedule { dueAt:string|null; deadlineAt:string|null; durationMinutes:number|null; timeZone:string; recurrence:string|null; }
export function validateTimeZone(timeZone:string):void { try { new Intl.DateTimeFormat("en-US",{timeZone}).format(); } catch { throw new Error("Invalid IANA time zone"); } }
export function validateDurationMinutes(value:number|null):void { if(value==null)return; if(!Number.isInteger(value)||value<0||value>1440) throw new Error("Duration must be between 0 and 1440 minutes"); }
