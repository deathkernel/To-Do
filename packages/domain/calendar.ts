export type CalendarProvider="google"|"microsoft"|"ical";
export interface CalendarEvent{externalId:string;calendarId:string;title:string;startsAt:string;endsAt:string;timeZone:string;}
export interface CalendarAdapter{list(from:string,to:string):Promise<CalendarEvent[]>;create(event:CalendarEvent):Promise<CalendarEvent>;update(id:string,event:Partial<CalendarEvent>):Promise<CalendarEvent>;delete(id:string):Promise<void>;}
export interface CalendarConnection{provider:CalendarProvider;accountId:string;accessTokenRef:string;refreshTokenRef?:string;expiresAt?:string;}