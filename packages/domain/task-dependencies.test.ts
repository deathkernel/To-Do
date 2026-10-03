import {describe,expect,it} from "vitest";
import {validateDependency,wouldCreateCycle} from "./task-dependencies";
describe("task dependencies",()=>{it("rejects self dependency",()=>expect(()=>validateDependency("a","a")).toThrow());it("detects cycles",()=>{const edges=[{taskId:"a",dependsOnTaskId:"b",createdAt:"now"}];expect(wouldCreateCycle(edges,"b","a")).toBe(true);});});