export interface Project { id:string; userId:string; parentProjectId:string|null; name:string; description:string; color:string|null; icon:string|null; favorite:boolean; archived:boolean; position:string; createdAt:string; updatedAt:string; }
export interface Section { id:string; projectId:string; name:string; position:string; createdAt:string; updatedAt:string; }

export function validateProjectName(name:string):string { const value=name.trim(); if(!value) throw new Error("Project name cannot be empty"); if(value.length>200) throw new Error("Project name cannot exceed 200 characters"); return value; }
export function validateSectionName(name:string):string { const value=name.trim(); if(!value) throw new Error("Section name cannot be empty"); if(value.length>200) throw new Error("Section name cannot exceed 200 characters"); return value; }
