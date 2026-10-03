export interface Goal { id:string; userId:string; name:string; target:number; current:number; period:"daily"|"weekly"|"monthly"|"custom"; startsAt:string; endsAt:string; }
export interface ProductivitySnapshot { userId:string; periodStart:string; periodEnd:string; completed:number; overdue:number; scheduledMinutes:number; completedMinutes:number; score:number; streakDays:number; }
export interface ActivityEvent { id:string; userId:string; actorId:string; entityType:string; entityId:string; action:string; createdAt:string; metadataJson:string; }
