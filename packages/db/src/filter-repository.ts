import {eq} from "drizzle-orm";import {getDb,savedFilters} from "./index";
export async function createSavedFilter(row:any){const r=await getDb().insert(savedFilters).values(row).returning();return r[0];}
export async function listSavedFilters(userId:string){return getDb().select().from(savedFilters).where(eq(savedFilters.userId,userId));}