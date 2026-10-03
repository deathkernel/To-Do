import {describe,expect,it} from "vitest"; import {validateProjectName,validateSectionName} from "./project.js";
describe("project validation",()=>{it("trims names",()=>expect(validateProjectName("  College  ")).toBe("College"));it("rejects empty project",()=>expect(()=>validateProjectName(" ")).toThrow());it("rejects empty section",()=>expect(()=>validateSectionName(" ")).toThrow())});
