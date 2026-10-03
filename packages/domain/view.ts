export type ViewType = "list"|"board"|"calendar"; export type GroupBy="none"|"project"|"section"|"priority"|"label"|"assignee"; export type SortBy="position"|"date"|"priority"|"name"|"created";
export interface SavedView { id:string; userId:string; name:string; type:ViewType; groupBy:GroupBy; sortBy:SortBy; density:"compact"|"comfortable"; configJson:string; }
