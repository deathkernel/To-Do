import {describe,expect,it} from "vitest";
import {processOperation} from "./sync-engine";
import {nextOccurrence} from "./recurrence-engine";
import {matchingAutomations} from "./automation-engine";
describe("runtime services",()=>{
  it("rejects duplicate sync operations",()=>{
    const known=new Set<string>(); const op={operationId:"1",actorId:"u",clientId:"c",clientTimestamp:new Date().toISOString(),baseRevision:0,resourceType:"task",resourceId:"t",mutation:{}};
    expect(processOperation(op,known,0).result).toBe("accepted");
    expect(processOperation(op,known,1).result).toBe("rejected");
  });
  it("computes daily recurrence",()=>expect(nextOccurrence("daily",new Date("2026-01-01T00:00:00Z")).toISOString()).toBe("2026-01-02T00:00:00.000Z"));
  it("matches enabled automation rules",()=>expect(matchingAutomations([{id:"1",ownerId:"u",name:"x",enabled:true,trigger:"task_completed",conditions:[],actions:[{type:"notify",payload:{}}],createdAt:new Date().toISOString()}],"task_completed")).toHaveLength(1));
});