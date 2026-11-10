import { describe, expect, it } from "vitest";
import "../../../extension/luca-import.js";

type Period = { lucaId: string; shortName: string; donemId: string; start: string; end: string };
type Luca = {
  firmsOfYear(list: string[][], year: string): Period[];
  selected(list: string[][], sirketId: string, donemId: string): Period | null;
  switchUrl(f: Period): string;
  parseIdentity(text: string): { name: string; start: string; end: string; taxNumber: string | null } | null;
  parsePlan(doc: unknown): { code: string; name: string }[];
};
const { AccountieLuca: luca } = globalThis as unknown as { AccountieLuca: Luca };

// Luca'nın sirketDonem dizisi: [0] firma no, [1] kısa ad, 5'ten sonra dörtlüler (dönem no, başlangıç, bitiş, bayrak).
const LIST = [
  ["11", "ÖRNEK A", "", "", "", "501", "01/01/2025", "31/12/2025", "0", "502", "01/01/2026", "31/12/2026", "1"],
  ["12", "ÖRNEK B", "", "", "", "601", "01/01/2024", "31/12/2024", "0"],
];

describe("Luca firma listesi", () => {
  it("yalnız o yıl dönemi olan firmaları, o dönemle verir", () => {
    expect(luca.firmsOfYear(LIST, "2026")).toEqual([{ lucaId: "11", shortName: "ÖRNEK A", donemId: "502", start: "01/01/2026", end: "31/12/2026" }]);
    expect(luca.firmsOfYear(LIST, "2027")).toEqual([]);
  });

  it("şu an seçili firma ve dönemi bulur; bulamazsa null", () => {
    expect(luca.selected(LIST, "12", "601")?.shortName).toBe("ÖRNEK B");
    expect(luca.selected(LIST, "12", "502")).toBeNull();
  });

  it("firma değiştirme adresi Luca'nın kendi seçicisinin gittiği adrestir", () => {
    const url = luca.switchUrl({ lucaId: "11", shortName: "ÖRNEK A", donemId: "502", start: "01/01/2026", end: "31/12/2026" });
    expect(url).toMatch(/^TopFrameAction\.do\?SIRKET_ID=11&DONEM_ID=502&DONEM_TXT=01\/01\/2026%20-%2031\/12\/2026&time=\d+$/);
  });
});

describe("Luca firma kimliği", () => {
  it("tam unvanı, dönemi ve vergi numarasını okur", () => {
    expect(luca.parseIdentity("  Şu an ÖRNEK GIDA\n SAN. VE TİC. LTD. ŞTİ. 01/01/2026-31/12/2026 döneminde çalışıyorsunuz!  Vergi No: 1234567890 "))
      .toEqual({ name: "ÖRNEK GIDA SAN. VE TİC. LTD. ŞTİ.", start: "01/01/2026", end: "31/12/2026", taxNumber: "1234567890" });
  });

  it("vergi numarası yoksa null, cümle yoksa hiçbir şey", () => {
    expect(luca.parseIdentity("Şu an ÖRNEK A 01/01/2026 - 31/12/2026 döneminde çalışıyorsunuz!")?.taxNumber).toBeNull();
    expect(luca.parseIdentity("Oturumunuz sona erdi.")).toBeNull();
  });
});

describe("Luca hesap planı", () => {
  const tr = (...cells: string[]) => ({ children: cells.map((textContent) => ({ textContent })) });
  const doc = (rows: unknown[]) => ({ querySelectorAll: () => rows });

  it("kod ve adı okur; başlık satırlarını, tek hücreli satırları ve yinelenen kodu atlar", () => {
    expect(luca.parsePlan(doc([
      tr("Hesap Kodu", "Hesap Adı"), tr(" 770.08 ", " Yeme-İçme Ve Ağırlama "), tr("320.M07", "ÖRNEK SATICI"), tr("770.08", "Yinelenen"), tr("100"), tr("Toplam", "18"),
    ]))).toEqual([{ code: "770.08", name: "Yeme-İçme Ve Ağırlama" }, { code: "320.M07", name: "ÖRNEK SATICI" }]);
  });
});
