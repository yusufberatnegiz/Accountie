import { describe, expect, it } from "vitest";
import { creditCost, MIN_BALANCE, PACKAGES, packageById, perCreditKurus, savingPercent, vatInsideKurus } from "./credits";

describe("kontör paketleri", () => {
  it("fiş başı fiyat ve en küçük pakete göre tasarruf", () => {
    expect(PACKAGES.map((p) => [p.credits, p.priceKurus / 100, perCreditKurus(p) / 100, savingPercent(p)])).toEqual([
      [100, 750, 7.5, 0],
      [1000, 3000, 3, 60],
      [2500, 6000, 2.4, 68],
      [5000, 10000, 2, 73],
    ]);
  });

  it("KDV dahil fiyatın içindeki KDV", () => {
    expect(vatInsideKurus(300_000)).toBe(50_000);
    expect(vatInsideKurus(75_000)).toBe(12_500);
  });

  it("bilinmeyen paket bulunmaz", () => {
    expect(packageById("k1000")?.credits).toBe(1000);
    expect(packageById("k999")).toBeUndefined();
    expect(packageById(undefined)).toBeUndefined();
  });

  it("fiş ve Z raporu 1, fatura 2, okunamayan belge 0 kontör", () => {
    expect(creditCost({ ok: true, kind: "receipt" })).toBe(1);
    expect(creditCost({ ok: true, kind: "z_report" })).toBe(1);
    expect(creditCost({ ok: true, kind: "domestic_invoice" })).toBe(2);
    expect(creditCost({ ok: true, kind: "foreign_invoice" })).toBe(2);
    expect(creditCost({ ok: false, kind: "receipt" })).toBe(0);
    expect(MIN_BALANCE).toBe(-4);
  });
});
