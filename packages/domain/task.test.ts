import { describe, expect, it } from "vitest";
import { validateDuration, validateTaskTitle } from "./task";

describe("task domain", () => {
  it("rejects an empty title", () => {
    expect(() => validateTaskTitle("   ")).toThrow();
  });

  it("trims a title", () => {
    expect(validateTaskTitle("  Study biology  ")).toBe("Study biology");
  });

  it("allows durations up to 24 hours", () => {
    expect(() => validateDuration(1440)).not.toThrow();
  });

  it("rejects durations over 24 hours", () => {
    expect(() => validateDuration(1441)).toThrow();
  });
});
