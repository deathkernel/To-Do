export const SYSTEM_VIEWS = ["inbox","today","upcoming","completed","favorites"] as const;
export type SystemView = typeof SYSTEM_VIEWS[number];
export interface NavigationItem { id:string; userId:string; type:"system"|"project"|"filter"; targetId:string; position:string; favorite:boolean; }
