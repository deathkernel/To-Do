export interface Comment { id:string; taskId:string|null; projectId:string|null; authorId:string; body:string; createdAt:string; updatedAt:string; deletedAt:string|null; }
export interface Attachment { id:string; ownerId:string; taskId:string|null; commentId:string|null; fileName:string; mimeType:string; sizeBytes:number; storageKey:string; createdAt:string; }
