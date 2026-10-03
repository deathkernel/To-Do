import {describe,expect,it} from "vitest";
import {buildServer} from "./server";
describe("label API",()=>{
 it("rejects unauthenticated label access",async()=>{
  const app=buildServer();
  const create=await app.inject({method:"POST",url:"/api/v1/labels",payload:{name:"work"}});
  expect(create.statusCode).toBe(401);
  const list=await app.inject({method:"GET",url:"/api/v1/labels"});
  expect(list.statusCode).toBe(401);
  await app.close();
 });
});