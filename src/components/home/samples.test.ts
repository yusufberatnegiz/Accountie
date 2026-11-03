import { describe, expect, it } from "vitest";
import { journalFor, SAMPLES, shownAccountName } from "./samples";

const rows = (id: string, payment: "card" | "cash") =>
  journalFor(SAMPLES.find((s) => s.id === id)!, payment).lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);

describe("ana sayfa fiş tezgâhı örnekleri", () => {
  it("alabalık fişi kartla 331.01, nakitle 100.01 alacaklı olur", () => {
    expect(rows("alabalik", "card")).toEqual([["770.08", 793182, 0], ["191.03.10", 79318, 0], ["331.01", 0, 872500]]);
    expect(rows("alabalik", "cash")[2]).toEqual(["100.01", 0, 872500]);
  });

  it("kırtasiye fişi matrahı brüt eksi KDV'dir", () => {
    expect(rows("kirtasiye", "cash")).toEqual([["770.02", 40000, 0], ["191.03.20", 8000, 0], ["100.01", 0, 48000]]);
  });

  it("iki oranlı market fişi her oran için ayrı satır açar ve dengededir", () => {
    expect(rows("market", "card")).toEqual([
      ["770.12", 40842, 0], ["191.03.01", 408, 0], ["770.12", 15500, 0], ["191.03.20", 3100, 0], ["331.01", 0, 59850],
    ]);
  });

  it("her örnek her ödeme şeklinde dengede ve uyarısız toplamdır", () => {
    for (const s of SAMPLES) for (const p of ["card", "cash"] as const) {
      const r = journalFor(s, p);
      expect(r.balanced).toBe(true);
      expect(r.warnings.map((w) => w.code).filter((c) => c !== "meal")).toEqual([]);
    }
  });

  it("Luca hesap adları sayfada yazım kuralıyla görünür", () => {
    expect(shownAccountName("% 10 Lı İndirilecek Kdv")).toBe("%10 İndirilecek KDV");
    expect(shownAccountName("% 1 Li İndirilecek Kdv")).toBe("%1 İndirilecek KDV");
    expect(shownAccountName("Yeme-İçme Ve Ağırlama Giderleri")).toBe("Yeme-İçme ve Ağırlama Giderleri");
    expect(shownAccountName("Kasa")).toBe("Kasa");
  });
});
