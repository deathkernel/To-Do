export interface AiProviderAdapter{complete(input:{prompt:string;system?:string}):Promise<{text:string;provider:string;model?:string}>}
export interface NotificationProvider{send(input:{userId:string;title:string;body:string;url?:string}):Promise<void>}
export interface CalendarProviderAdapter{provider:string;connect():Promise<void>}
export class ProviderRegistry{constructor(public readonly ai?:AiProviderAdapter,public readonly notifications?:NotificationProvider,public readonly calendar?:CalendarProviderAdapter){}}