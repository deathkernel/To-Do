import type {BackupManifest,ImportValidationResult} from "./backup";
export function validateImport(manifest:BackupManifest):ImportValidationResult{
  const errors:string[]=[];
  if(!manifest.version)errors.push("Missing backup version");
  if(!manifest.createdAt)errors.push("Missing backup timestamp");
  if(!manifest.userId)errors.push("Missing owner");
  return {valid:errors.length===0,errors};
}