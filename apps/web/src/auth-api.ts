export interface AuthUser{id:string;email:string;displayName:string}
export interface AuthResponse{user:AuthUser;token:string}
const API_URL=import.meta.env.VITE_API_URL??"http://localhost:3000";
async function call<T>(path:string,body:unknown){const r=await fetch(API_URL+path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error??"Authentication failed");return data as T}
export const register=(email:string,password:string,displayName:string)=>call<AuthResponse>("/api/v1/auth/register",{email,password,displayName});
export const login=(email:string,password:string)=>call<AuthResponse>("/api/v1/auth/login",{email,password});