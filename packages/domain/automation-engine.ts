import type {AutomationRule} from "./automation";
export function matchingAutomations(rules:AutomationRule[],event:AutomationRule["trigger"]){return rules.filter(r=>r.enabled&&r.trigger===event&&r.actions.length>0);}
export function shouldRun(rule:AutomationRule,now=new Date()){return rule.enabled&&rule.actions.length>0&&(!rule.createdAt||new Date(rule.createdAt)<=now);}