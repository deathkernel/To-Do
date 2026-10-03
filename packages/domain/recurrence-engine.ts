import type {Schedule} from "./scheduling";
export function nextOccurrence(rule:string,from:Date):Date{
  const value=rule.toLowerCase();
  const d=new Date(from);
  if(value.includes("daily"))d.setUTCDate(d.getUTCDate()+1);
  else if(value.includes("weekly"))d.setUTCDate(d.getUTCDate()+7);
  else if(value.includes("monthly"))d.setUTCMonth(d.getUTCMonth()+1);
  else if(value.includes("yearly")||value.includes("annual"))d.setUTCFullYear(d.getUTCFullYear()+1);
  return d;
}
export function hasRecurrence(schedule:Schedule){return Boolean(schedule.recurrence?.trim());}