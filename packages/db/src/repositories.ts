import {and,eq} from "drizzle-orm";
import {getDb,users,sessions,projects,labels,tasks,reminders,comments,workspaces,goals,automationRules,apiTokens} from "./index";
export async function getDbUser(id:string){const rows=await getDb().select().from(users).where(eq(users.id,id));return rows[0]??null;}
export async function findUserByEmail(email:string){const rows=await getDb().select().from(users).where(eq(users.email,email.toLowerCase()));return rows[0]??null;}
export async function createUser(row:{id:string,email:string,displayName:string,passwordHash:string}){const rows=await getDb().insert(users).values(row).returning();return rows[0];}
export async function createSession(row:{id:string,userId:string,tokenHash:string,expiresAt:Date}){const rows=await getDb().insert(sessions).values(row).returning();return rows[0];}
export async function findSession(tokenHash:string){const rows=await getDb().select().from(sessions).where(eq(sessions.tokenHash,tokenHash));return rows[0]??null;}
export async function revokeSession(id:string){await getDb().update(sessions).set({revokedAt:new Date()}).where(eq(sessions.id,id));}
export async function listUserProjects(userId:string){return getDb().select().from(projects).where(eq(projects.userId,userId));}
export async function insertProject(row:any){const rows=await getDb().insert(projects).values(row).returning();return rows[0];}
export async function listUserLabels(userId:string){return getDb().select().from(labels).where(eq(labels.userId,userId));}
export async function insertLabel(row:any){const rows=await getDb().insert(labels).values(row).returning();return rows[0];}
export async function listUserTasks(userId:string){return getDb().select().from(tasks).where(and(eq(tasks.userId,userId),eq(tasks.status,"active")));}
export async function insertReminder(row:any){const rows=await getDb().insert(reminders).values(row).returning();return rows[0];}
export async function listUserReminders(userId:string){return getDb().select().from(reminders).where(eq(reminders.userId,userId));}
export async function insertComment(row:any){const t=await getDb().select({id:tasks.id}).from(tasks).where(and(eq(tasks.id,row.taskId),eq(tasks.userId,row.userId)));if(!t[0])throw new Error("Task not found");const rows=await getDb().insert(comments).values(row).returning();return rows[0];}
export async function listTaskComments(taskId:string,userId:string){const t=await getDb().select({id:tasks.id}).from(tasks).where(and(eq(tasks.id,taskId),eq(tasks.userId,userId)));if(!t[0])throw new Error("Task not found");return getDb().select().from(comments).where(eq(comments.taskId,taskId));}
export async function insertWorkspace(row:any){const rows=await getDb().insert(workspaces).values(row).returning();return rows[0];}
export async function listWorkspaces(ownerId:string){return getDb().select().from(workspaces).where(eq(workspaces.ownerId,ownerId));}
export async function insertGoal(row:any){const rows=await getDb().insert(goals).values(row).returning();return rows[0];}
export async function listGoals(userId:string){return getDb().select().from(goals).where(eq(goals.userId,userId));}
export async function insertAutomation(row:any){const rows=await getDb().insert(automationRules).values(row).returning();return rows[0];}
export async function listAutomations(ownerId:string){return getDb().select().from(automationRules).where(eq(automationRules.ownerId,ownerId));}
export async function insertApiToken(row:any){const rows=await getDb().insert(apiTokens).values(row).returning();return rows[0];}
export async function listApiTokens(ownerId:string){return getDb().select().from(apiTokens).where(eq(apiTokens.ownerId,ownerId));}
export async function findActiveApiToken(tokenHash:string){const rows=await getDb().select().from(apiTokens).where(and(eq(apiTokens.tokenHash,tokenHash),eq(apiTokens.revokedAt,null as any)));return rows[0]??null;}