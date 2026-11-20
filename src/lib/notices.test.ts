import { describe, expect, it } from "vitest";
import { daysSince, gibDay, servedState } from "./notices";

describe("e-Tebligat tarihleri", () => {
  it("GİB tarihi gün olarak okunur, saat yok sayılır, bozuk tarih null", () => {
    expect(gibDay("23/11/2026")).toBe("2026-11-23");
    expect(gibDay("23.11.2026 14:05:00")).toBe("2026-11-23");
    expect(gibDay("2026-11-23")).toBeNull();
    expect(gibDay(null)).toBeNull();
  });
  it("tebliğ günü Türkiye saatiyle: o gün ve sonrası geçmiş, öncesi ileri", () => {
    const now = new Date("2026-11-22T22:30:00Z"); // Türkiye'de 23 Kasım 01:30
    expect(servedState("23/11/2026", now)).toBe("past");
    expect(servedState("24/11/2026", now)).toBe("future");
    expect(servedState(null, now)).toBeNull();
  });
  it("gün farkı", () => {
    expect(daysSince(new Date("2026-11-12T09:00:00Z"), new Date("2026-11-20T08:00:00Z"))).toBe(7);
  });
});
