import type {BackupManifest,ImportValidationResult} from "./backup";
export function validateImport(manifest:BackupManifest):ImportValidationResult{
  const errors:string[]=[];
  if(!Number.isInteger(manifest.schemaVersion)||manifest.schemaVersion<1)errors.push("Invalid schema version");
  if(!manifest.accountId)errors.push("Missing account ID");
  if(!manifest.exportedAt||Number.isNaN(Date.parse(manifest.exportedAt)))errors.push("Invalid export timestamp");
  return {valid:errors.length===0,errors,warnings:[]};
}