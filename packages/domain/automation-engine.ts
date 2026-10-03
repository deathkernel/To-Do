import type {AutomationRule} from "./automation";
export function matchingAutomations(rules:AutomationRule[],event:string){return rules.filter(r=>r.enabled&&r.trigger.type===event);}
export function shouldRun(rule:AutomationRule,now=new Date()){return rule.enabled && (!rule.lastRunAt || now.getTime()-new Date(rule.lastRunAt).getTime()>1000);}