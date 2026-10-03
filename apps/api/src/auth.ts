import argon2 from "argon2";
import {SignJWT,jwtVerify} from "jose";
import crypto from "node:crypto";
const secret=()=>new TextEncoder().encode(process.env.AUTH_SECRET||"development-only-change-me");
export type AuthUser={id:string,email:string,displayName:string};
const users=new Map<string,AuthUser&{passwordHash:string}>();
export async function register(email:string,password:string,displayName:string){
  const normalized=email.trim().toLowerCase();
  if(users.values().some(u=>u.email===normalized)) throw new Error("Email already registered");
  if(password.length<10) throw new Error("Password must be at least 10 characters");
  const user={id:crypto.randomUUID(),email:normalized,displayName:displayName.trim(),passwordHash:await argon2.hash(password)};
  users.set(user.id,user); return publicUser(user);
}
export async function login(email:string,password:string){
  const user=[...users.values()].find(u=>u.email===email.trim().toLowerCase());
  if(!user || !(await argon2.verify(user.passwordHash,password))) throw new Error("Invalid credentials");
  return {user:publicUser(user),token:await issueToken(user)};
}
export async function issueToken(user:AuthUser){return new SignJWT({sub:user.id,email:user.email}).setProtectedHeader({alg:"HS256"}).setIssuedAt().setExpirationTime("30d").sign(secret());}
export async function authenticate(header?:string):Promise<AuthUser>{
  if(!header?.startsWith("Bearer ")) throw new Error("Authentication required");
  const {payload}=await jwtVerify(header.slice(7),secret());
  if(!payload.sub) throw new Error("Invalid session");
  const user=users.get(payload.sub); if(!user) throw new Error("Invalid session");
  return publicUser(user);
}
function publicUser(u:AuthUser){return {id:u.id,email:u.email,displayName:u.displayName};}