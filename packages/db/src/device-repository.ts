import {and,eq} from "drizzle-orm";import {getDb,devices} from "./index";
export async function registerDevice(row:any){const r=await getDb().insert(devices).values(row).returning();return r[0];}
export async function listDevices(userId:string){return getDb().select().from(devices).where(eq(devices.userId,userId));}
export async function revokeDevice(userId:string,id:string){await getDb().update(devices).set({revokedAt:new Date()}).where(and(eq(devices.id,id),eq(devices.userId,userId)));}