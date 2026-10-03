import {describe,expect,it} from "vitest";
import {buildServer} from "./server";
describe("task API",()=>{
 it("rejects unauthenticated task access",async()=>{
  const app=buildServer();
  const create=await app.inject({method:"POST",url:"/api/v1/tasks",payload:{title:"Build To-Do"}});
  expect(create.statusCode).toBe(401);
  const list=await app.inject({method:"GET",url:"/api/v1/tasks"});
  expect(list.statusCode).toBe(401);
  await app.close();
 });
});