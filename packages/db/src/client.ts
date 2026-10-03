import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {sql} from "drizzle-orm";
import * as schema from "./schema";
let client:ReturnType<typeof postgres>|undefined;
export function getDb(){const url=process.env.DATABASE_URL;if(!url)throw new Error("DATABASE_URL is required");client??=postgres(url,{max:Number(process.env.DB_POOL_SIZE??10)});return drizzle(client,{schema});}
export type Database=ReturnType<typeof getDb>;
export async function checkDatabase(){await getDb().execute(sql`select 1`);return true;}