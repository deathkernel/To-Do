import argon2 from "argon2";
import crypto from "node:crypto";
import {findUserByEmail,createUser} from "../../../packages/db/src/repositories";
import {persistSession} from "./session-store";
export type AuthUser={id:string,email:string,displayName:string};
const memory=new Map<string,AuthUser&{passwordHash:string}>();
export async function register(email:string,password:string,displayName:string){
 const normalized=email.trim().toLowerCase(); if(password.length<10)throw new Error("Password must be at least 10 characters");
 try{const existing=await findUserByEmail(normalized);if(existing)throw new Error("Email already registered");}catch(e){if(e instanceof Error&&e.message==="Email already registered")throw e;}
 const user={id:crypto.randomUUID(),email:normalized,displayName:displayName.trim(),passwordHash:await argon2.hash(password)};
 try{await createUser(user)}catch{memory.set(user.id,user)}
 return {id:user.id,email:user.email,displayName:user.displayName};
}
export async function login(email:string,password:string){
 const normalized=email.trim().toLowerCase();let user:any;
 try{user=await findUserByEmail(normalized)}catch{}
 if(user){if(!user.passwordHash||!(await argon2.verify(user.passwordHash,password)))throw new Error("Invalid credentials");const publicUser={id:user.id,email:user.email,displayName:user.displayName};return {user:publicUser,token:await persistSession(user.id)}}
 user=[...memory.values()].find(u=>u.email===normalized);if(!user||!(await argon2.verify(user.passwordHash,password)))throw new Error("Invalid credentials");
 return {user:{id:user.id,email:user.email,displayName:user.displayName},token:await persistSession(user.id).catch(()=>crypto.randomBytes(32).toString("hex"))};
}
export async function authenticate(header?:string):Promise<AuthUser>{
 if(!header?.startsWith("Bearer "))throw new Error("Authentication required");
 const token=header.slice(7);const session=await import("./session-store").then(m=>m.loadSession(token));
 if(!session)throw new Error("Invalid or expired session");
 const dbUser=await import("../../../packages/db/src/repositories").then(m=>m.getDbUser(session.userId));
 if(!dbUser)throw new Error("User not found");
 return {id:dbUser.id,email:dbUser.email,displayName:dbUser.displayName};
}