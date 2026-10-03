import {and,eq} from "drizzle-orm";import {getDb,templates} from "./index";
export async function createTemplate(row:any){const r=await getDb().insert(templates).values(row).returning();return r[0];}
export async function listTemplates(ownerId:string){return getDb().select().from(templates).where(eq(templates.ownerId,ownerId));}
export async function getTemplate(ownerId:string,id:string){const r=await getDb().select().from(templates).where(and(eq(templates.ownerId,ownerId),eq(templates.id,id)));return r[0]??null;}