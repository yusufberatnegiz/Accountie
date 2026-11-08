import { describe, expect, it } from "vitest";
import { currentMonth, isMonth, monthLabel, monthState, recentMonths } from "./month";

describe("ay", () => {
  it("ayı Türkiye saatine göre alır ve geriye doğru sayar", () => {
    expect(currentMonth(new Date("2026-09-30T21:30:00Z"))).toBe("2026-10"); // 1 Ekim 00:30 Türkiye
    expect(recentMonths(new Date("2026-02-10T12:00:00Z"), 4)).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
    expect(monthLabel("2026-09")).toBe("Eylül 2026");
  });

  it("yalnız YYYY-AA biçimini kabul eder", () => {
    expect(isMonth("2026-09")).toBe(true);
    for (const bad of ["2026-13", "2026-9", "26-09", "2026-09-01", "", null]) expect(isMonth(bad), String(bad)).toBe(false);
  });

  it("ay kapama: taslak ya da indirilmemiş onaylı varken bekleyen, hepsi Luca'daysa tamam, fiş yoksa boş", () => {
    expect(monthState({ draft: 1, approved: 0, exported: 9 })).toBe("bekleyen");
    expect(monthState({ draft: 0, approved: 2, exported: 0 })).toBe("bekleyen");
    expect(monthState({ draft: 0, approved: 0, exported: 3 })).toBe("tamam");
    expect(monthState({ draft: 0, approved: 0, exported: 0 })).toBe("bos");
  });
});
