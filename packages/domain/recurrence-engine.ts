import type {RecurrenceRule} from "./scheduling";
export function nextOccurrence(rule:RecurrenceRule,from:Date):Date{
  const d=new Date(from);
  const count=rule.interval??1;
  if(rule.frequency==="daily")d.setUTCDate(d.getUTCDate()+count);
  else if(rule.frequency==="weekly")d.setUTCDate(d.getUTCDate()+7*count);
  else if(rule.frequency==="monthly")d.setUTCMonth(d.getUTCMonth()+count);
  else d.setUTCFullYear(d.getUTCFullYear()+count);
  return d;
}