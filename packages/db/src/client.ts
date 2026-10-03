import postgres from "postgres";
import {drizzle} from "drizzle-orm/postgres-js";
import {sql} from "drizzle-orm";
import * as schema from "./schema";

let client:ReturnType<typeof postgres>|undefined;

function databaseUrl(){
  const configured=process.env.DATABASE_URL?.trim();
  if(configured) return configured;
  if(process.env.NODE_ENV==="production") throw new Error("DATABASE_URL is required in production");
  return "postgresql://todo:todo_dev_only@localhost:5432/todo";
}

export function getDb(){
  client??=postgres(databaseUrl(),{max:Number(process.env.DB_POOL_SIZE??10)});
  return drizzle(client,{schema});
}
export type Database=ReturnType<typeof getDb>;
export async function checkDatabase(){await getDb().execute(sql`select 1`);return true;}
