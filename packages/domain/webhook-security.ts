import crypto from "node:crypto";
export function signWebhook(payload:string,secret:string){return crypto.createHmac("sha256",secret).update(payload).digest("hex");}
export function verifyWebhook(payload:string,signature:string,secret:string){const expected=signWebhook(payload,secret);return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(signature));}