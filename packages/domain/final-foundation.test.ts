import { describe, expect, it } from "vitest";
import { canRunAutomation } from "./automation";
import { isValidLocale, isValidTimezone } from "./customization";
import { isDeviceActive } from "./platform";
import { validateQuickAddCommand } from "./quick-add";
import { isValidCapacity } from "./advanced-productivity";

describe("final feature foundations", () => {
  it("only runs enabled automations with actions", () => {
    const rule = {
      id: "a",
      ownerId: "u",
      name: "Complete cleanup",
      enabled: true,
      trigger: "task_completed" as const,
      conditions: [],
      actions: [{ type: "add_label" as const, payload: { label: "done" } }],
      createdAt: new Date().toISOString()
    };
    expect(canRunAutomation(rule)).toBe(true);
    expect(canRunAutomation({ ...rule, enabled: false })).toBe(false);
  });

  it("validates preferences", () => {
    expect(isValidLocale("en-US")).toBe(true);
    expect(isValidTimezone("Asia/Kolkata")).toBe(true);
  });

  it("supports device revocation", () => {
    const device = {
      id: "d",
      userId: "u",
      platform: "web" as const,
      lastSeenAt: new Date().toISOString()
    };
    expect(isDeviceActive(device)).toBe(true);
    expect(isDeviceActive({ ...device, revokedAt: new Date().toISOString() })).toBe(false);
  });

  it("validates quick add", () => {
    expect(validateQuickAddCommand({ title: "", labels: [] })).toContain("Task title is required");
    expect(validateQuickAddCommand({ title: "Buy milk", labels: [], priority: 2 })).toEqual([]);
  });

  it("validates capacity windows", () => {
    expect(isValidCapacity({
      userId: "u",
      startAt: "2026-10-03T09:00:00Z",
      endAt: "2026-10-03T10:00:00Z",
      availableMinutes: 60
    })).toBe(true);
  });
});
