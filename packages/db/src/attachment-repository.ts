import {and,eq} from "drizzle-orm";import {getDb,attachments} from "./index";
export async function createAttachment(row:any){const r=await getDb().insert(attachments).values(row).returning();return r[0];}
export async function listTaskAttachments(userId:string,taskId:string){return getDb().select().from(attachments).where(and(eq(attachments.userId,userId),eq(attachments.taskId,taskId)));}