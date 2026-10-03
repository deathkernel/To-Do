import {and,eq} from "drizzle-orm";
import {getDb,projects,sections} from "./index";

export async function listProjectSections(userId:string,projectId:string){
  const owned=(await getDb().select({id:projects.id}).from(projects).where(and(eq(projects.id,projectId),eq(projects.userId,userId))))[0];
  if(!owned) throw new Error("Project not found");
  return getDb().select().from(sections).where(eq(sections.projectId,projectId));
}

export async function createSection(userId:string,row:{id:string;projectId:string;name:string;position:number}){
  const owned=(await getDb().select({id:projects.id}).from(projects).where(and(eq(projects.id,row.projectId),eq(projects.userId,userId))))[0];
  if(!owned) throw new Error("Project not found");
  const rows=await getDb().insert(sections).values({...row}).returning();
  return rows[0];
}

export async function updateSection(userId:string,id:string,patch:Partial<{name:string;position:number}>){
  const owned=(await getDb().select({id:sections.id}).from(sections).innerJoin(projects,eq(sections.projectId,projects.id)).where(and(eq(sections.id,id),eq(projects.userId,userId))))[0];
  if(!owned) throw new Error("Section not found");
  const rows=await getDb().update(sections).set({...patch,updatedAt:new Date()}).where(eq(sections.id,id)).returning();
  return rows[0];
}

export async function deleteSection(userId:string,id:string){
  const owned=(await getDb().select({id:sections.id}).from(sections).innerJoin(projects,eq(sections.projectId,projects.id)).where(and(eq(sections.id,id),eq(projects.userId,userId))))[0];
  if(!owned) throw new Error("Section not found");
  await getDb().delete(sections).where(eq(sections.id,id));
}
