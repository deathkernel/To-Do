import argon2 from "argon2";
import crypto from "node:crypto";
import {createHash} from "node:crypto";
import {findUserByEmail,createUser,getDbUser,findActiveApiToken} from "../../../packages/db/src/repositories";
import {persistSession,loadSession} from "./session-store";
export type AuthUser={id:string,email:string,displayName:string};
export async function register(email:string,password:string,displayName:string){
 const normalized=email.trim().toLowerCase();
 if(!normalized||!normalized.includes("@"))throw new Error("Valid email is required");
 if(password.length<10)throw new Error("Password must be at least 10 characters");
 if(!displayName.trim())throw new Error("Display name is required");
 if(await findUserByEmail(normalized))throw new Error("Email already registered");
 const user={id:crypto.randomUUID(),email:normalized,displayName:displayName.trim(),passwordHash:await argon2.hash(password)};
 await createUser(user);
 return {id:user.id,email:user.email,displayName:user.displayName};
}
export async function login(email:string,password:string){
 const normalized=email.trim().toLowerCase();
 const user=await findUserByEmail(normalized);
 if(!user||!user.passwordHash||!(await argon2.verify(user.passwordHash,password)))throw new Error("Invalid credentials");
 const publicUser={id:user.id,email:user.email,displayName:user.displayName};
 return {user:publicUser,token:await persistSession(user.id)};
}
export async function authenticate(header?:string):Promise<AuthUser>{
 if(!header?.startsWith("Bearer "))throw new Error("Authentication required");
 const token=header.slice(7);
 if(!token||token.length>512)throw new Error("Invalid session token");
 if(token.startsWith("td_")){const apiToken=await findActiveApiToken(createHash("sha256").update(token).digest("hex"));if(!apiToken)throw new Error("Invalid or revoked API token");const dbUser=await getDbUser(apiToken.ownerId);if(!dbUser)throw new Error("User not found");return {id:dbUser.id,email:dbUser.email,displayName:dbUser.displayName};}
 const session=await loadSession(token);
 if(!session)throw new Error("Invalid or expired session");
 const dbUser=await getDbUser(session.userId);
 if(!dbUser)throw new Error("User not found");
 return {id:dbUser.id,email:dbUser.email,displayName:dbUser.displayName};
}