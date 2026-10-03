import {describe,expect,it} from "vitest"; import {validateLabelName} from "./labels.js";
describe("labels",()=>{it("trims label names",()=>expect(validateLabelName("  study  ")).toBe("study"));it("rejects empty labels",()=>expect(()=>validateLabelName(" ")).toThrow())});
