export interface Label { id:string; userId:string; name:string; color:string|null; description:string; favorite:boolean; }
export function validateLabelName(name:string):string { const value=name.trim(); if(!value) throw new Error("Label name cannot be empty"); if(value.length>100) throw new Error("Label name cannot exceed 100 characters"); return value; }
