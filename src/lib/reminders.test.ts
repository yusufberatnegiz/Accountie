import { describe, expect, it } from "vitest";
import { reminderInIstanbul, reminderInputParts } from "./reminders";

describe("note reminders", () => {
  it("uses 09:00 Istanbul time when only a date is selected", () => {
    expect(reminderInIstanbul("2026-08-30", undefined)?.toISOString()).toBe("2026-08-30T06:00:00.000Z");
  });

  it("fills separate date and time inputs in Istanbul time", () => {
    expect(reminderInputParts(new Date("2026-08-30T11:45:00.000Z"))).toEqual({ date: "2026-08-30", time: "14:45" });
  });
});
