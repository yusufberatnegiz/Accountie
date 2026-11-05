import { describe, expect, it } from "vitest";
import { AKARYAKIT, journalFor, KAFE, OTOPARK, PAYMENTS, SAMPLES, shownAccountName, sourcesFor, type Payment } from "./samples";

const rows = (id: string, payment: Payment["id"]) =>
  journalFor(SAMPLES.find((s) => s.id === id)!, payment).lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);

describe("ana sayfa fiş tezgâhı örnekleri", () => {
  it("lokanta fişi ortağın kartıyla 331.01, şirket kartıyla 309.01, nakitle 100.01 alacaklı olur", () => {
    expect(rows("lokanta", "partner")).toEqual([["770.08", 589091, 0], ["191.03.10", 58909, 0], ["331.01", 0, 648000]]);
    expect(rows("lokanta", "company")[2]).toEqual(["309.01", 0, 648000]);
    expect(rows("lokanta", "cash")[2]).toEqual(["100.01", 0, 648000]);
  });

  it("kırtasiye fişi matrahı brüt eksi KDV'dir", () => {
    expect(rows("kirtasiye", "cash")).toEqual([["770.02", 40000, 0], ["191.03.20", 8000, 0], ["100.01", 0, 48000]]);
  });

  it("iki oranlı market fişi her oran için ayrı satır açar ve dengededir", () => {
    expect(rows("market", "partner")).toEqual([
      ["770.12", 40842, 0], ["191.03.01", 408, 0], ["770.12", 15500, 0], ["191.03.20", 3100, 0], ["331.01", 0, 59850],
    ]);
  });

  it("her örnek her ödeme şeklinde dengede ve uyarısız toplamdır", () => {
    for (const s of SAMPLES) for (const p of PAYMENTS) {
      const r = journalFor(s, p.id);
      expect(r.balanced).toBe(true);
      expect(r.warnings.map((w) => w.code).filter((c) => c !== "meal")).toEqual([]);
    }
  });

  it("fişteki kalemler her oranın brütünü tutar ve her satırın fişte bir kaynağı vardır", () => {
    for (const s of SAMPLES) {
      for (const v of s.receipt.vatLines) expect(s.items.filter((i) => i.rate === v.rate).reduce((a, i) => a + i.kurus, 0)).toBe(v.grossKurus);
      expect(sourcesFor(s)).toHaveLength(journalFor(s, "partner").lines.length);
    }
  });

  it("sayfadaki diğer fişler (akaryakıt, kafe) dengede, kalemleri brütü tutar, rakamları sahnelerdeki gibidir", () => {
    for (const s of [AKARYAKIT, KAFE, OTOPARK]) {
      expect(journalFor(s, "partner").balanced).toBe(true);
      for (const v of s.receipt.vatLines) expect(s.items.filter((i) => i.rate === v.rate).reduce((a, i) => a + i.kurus, 0)).toBe(v.grossKurus);
    }
    const r = (s: typeof KAFE) => journalFor(s, "partner").lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);
    expect(r(AKARYAKIT)).toEqual([["770.01", 179167, 0], ["191.03.20", 35833, 0], ["331.01", 0, 215000]]);
    expect(r(KAFE)).toEqual([["770.08", 24091, 0], ["191.03.10", 2409, 0], ["331.01", 0, 26500]]);
    expect(r(OTOPARK)).toEqual([["770.04", 10000, 0], ["191.03.20", 2000, 0], ["331.01", 0, 12000]]);
  });

  it("ağırlama uyarısı ortağın kartında çıkar, şirket kartında çıkmaz", () => {
    const codes = (p: Payment["id"]) => journalFor(SAMPLES[0], p).warnings.map((w) => w.code);
    expect(codes("partner")).toContain("meal");
    expect(codes("company")).not.toContain("meal");
  });

  it("Luca hesap adları sayfada yazım kuralıyla görünür", () => {
    expect(shownAccountName("% 10 Lı İndirilecek Kdv")).toBe("%10 İndirilecek KDV");
    expect(shownAccountName("% 1 Li İndirilecek Kdv")).toBe("%1 İndirilecek KDV");
    expect(shownAccountName("Yeme-İçme Ve Ağırlama Giderleri")).toBe("Yeme-İçme ve Ağırlama Giderleri");
    expect(shownAccountName("Kasa")).toBe("Kasa");
  });
});
