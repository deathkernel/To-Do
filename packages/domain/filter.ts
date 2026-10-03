export type FilterNode = { kind:"term"; field:string; operator:"="|"!="|">"|">="|"<"|"<="|"contains"; value:string } | { kind:"and"|"or"; children:FilterNode[] } | { kind:"not"; child:FilterNode };

export interface SavedFilter { id:string; userId:string; name:string; expression:string; favorite:boolean; }

export function validateFilterExpression(expression:string):string { const value=expression.trim(); if(!value) throw new Error("Filter expression cannot be empty"); if(value.length>2000) throw new Error("Filter expression is too long"); return value; }
