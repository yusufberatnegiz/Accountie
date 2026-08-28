import { describe, expect, it } from "vitest";
import { daysUntil, getUrgency, todayInIstanbul } from "./deadlines";

describe("deadline urgency", () => {
  const today = "2026-08-28";

  it.each([
    ["2026-08-27", "past"],
    ["2026-08-28", "today"],
    ["2026-08-29", "urgent"],
    ["2026-08-31", "urgent"],
    ["2026-09-01", "near"],
    ["2026-09-04", "near"],
    ["2026-09-05", "safe"],
  ] as const)("classifies %s as %s", (date, expected) => {
    expect(getUrgency(date, today)).toBe(expected);
  });

  it("counts calendar days across a month boundary", () => {
    expect(daysUntil("2026-09-02", "2026-08-28")).toBe(5);
  });

  it("uses Europe/Istanbul when deriving today", () => {
    expect(todayInIstanbul(new Date("2026-08-27T21:30:00Z"))).toBe("2026-08-28");
  });
});
