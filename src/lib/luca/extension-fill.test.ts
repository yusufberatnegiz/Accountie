import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../default-rules";
import { buildJournalLines } from "../journal";
import { lucaGridRows } from "./clipboard";
import "../../../extension/fill.js";
import "../../../extension/selectors.js";

type FakeEl = { value: string; events: string[]; dispatchEvent(e: Event): boolean; focus(): void };
type Fill = {
  FIELDS: string[];
  fillReceipt(doc: unknown, rows: unknown[], sel: Selectors): { gridFound: boolean; filled: number; missing: { row: number; field: string }[]; extraRows: number };
  summarize(results: unknown[], rowCount: number): { ok: boolean; gridFound: boolean; message: string };
};
type Selectors = { row: string; addRow: string | null; cells: Record<string, string> };

const { AccountieFill: fill, AccountieSelectors: realSelectors } = globalThis as unknown as { AccountieFill: Fill; AccountieSelectors: Selectors };

const { lines } = buildJournalLines({
  vendorName: "ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ", receiptNo: "0047", date: "2026-09-05",
  vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
}, DEFAULT_RULES);
const rows = lucaGridRows(lines);

const SEL: Selectors = { row: "tr.grid", addRow: "#ekle", cells: Object.fromEntries(fill.FIELDS.map((f) => [f, `.${f}`])) };

const el = (): FakeEl => ({ value: "", events: [], dispatchEvent(e) { this.events.push(e.type); return true; }, focus() {} });
const gridRow = (fields = fill.FIELDS) => {
  const cells = Object.fromEntries(fields.map((f) => [`.${f}`, el()]));
  return { cells, querySelector: (s: string) => cells[s] ?? null };
};
function fakeDoc(rowCount: number, opts: { addRowText?: string; fields?: string[] } = {}) {
  const grid = Array.from({ length: rowCount }, () => gridRow(opts.fields));
  const button = { textContent: opts.addRowText ?? "Satır Ekle", clicks: 0, click() { this.clicks++; grid.push(gridRow(opts.fields)); } };
  return {
    grid, button,
    querySelectorAll: (s: string) => (s === SEL.row ? grid : []),
    querySelector: (s: string) => (s === SEL.addRow ? button : null),
  };
}

describe("lucaGridRows", () => {
  it("Fiş Detayı kolonlarını Luca biçiminde metne çevirir", () => {
    expect(rows).toEqual([
      { accountCode: "770.08", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "örnek alabalık üretim çiftliği", debit: "7.931,82", credit: "" },
      { accountCode: "191.03.10", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "örnek alabalık üretim çiftliği", debit: "793,18", credit: "" },
      { accountCode: "331.01", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "örnek alabalık üretim çiftliği", debit: "", credit: "8.725,00" },
    ]);
  });
});

describe("eklenti satır doldurma", () => {
  it("üç satırı doldurur, boş tutarı yazmaz, input/change olaylarını tetikler", () => {
    const doc = fakeDoc(3);
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(result).toEqual({ gridFound: true, filled: 18, missing: [], extraRows: 0 });
    expect(doc.grid[0].cells[".accountCode"].value).toBe("770.08");
    expect(doc.grid[0].cells[".debit"].value).toBe("7.931,82");
    expect(doc.grid[0].cells[".credit"].value).toBe("");
    expect(doc.grid[2].cells[".credit"].value).toBe("8.725,00");
    expect(doc.grid[0].cells[".documentNo"].events).toEqual(["input", "change", "blur"]);
  });

  it("önceden dolu satırda boş kalan tutarı temizler", () => {
    const doc = fakeDoc(3);
    doc.grid[0].cells[".credit"].value = "999,00";
    fill.fillReceipt(doc, rows, SEL);
    expect(doc.grid[0].cells[".credit"].value).toBe("");
  });

  it("satır yetmezse Satır Ekle ile yeni satır açar", () => {
    const doc = fakeDoc(1);
    expect(fill.fillReceipt(doc, rows, SEL).missing).toEqual([]);
    expect(doc.button.clicks).toBe(2);
  });

  it("Kaydet yazan düğmeye asla basmaz", () => {
    const doc = fakeDoc(1, { addRowText: " Kaydet " });
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(doc.button.clicks).toBe(0);
    expect(result.missing).toEqual([{ row: 2, field: "row" }, { row: 3, field: "row" }]);
  });

  it("bulunamayan hücreyi satır ve alan olarak bildirir", () => {
    const doc = fakeDoc(3, { fields: fill.FIELDS.filter((f) => f !== "documentType") });
    expect(fill.fillReceipt(doc, rows, SEL).missing).toEqual([1, 2, 3].map((row) => ({ row, field: "documentType" })));
  });

  it("kaydın altında kalan dolu satırları sayar ama silmez", () => {
    const doc = fakeDoc(5);
    doc.grid[4].cells[".debit"].value = "100,00";
    expect(fill.fillReceipt(doc, rows, SEL).extraRows).toBe(1);
    expect(doc.grid[4].cells[".debit"].value).toBe("100,00");
  });

  it("tablo yoksa gridFound false döner", () => {
    expect(fill.fillReceipt(fakeDoc(0), rows, SEL)).toEqual({ gridFound: false, filled: 0, missing: [], extraRows: 0 });
  });
});

describe("çerçeve sonuçlarının özeti", () => {
  it("hiçbir çerçevede tablo yoksa açıkça söyler", () => {
    const s = fill.summarize([{ gridFound: false, filled: 0, missing: [] }, null], 3);
    expect(s.ok).toBe(false);
    expect(s.gridFound).toBe(false);
    expect(s.message).toContain("Fiş Detayı tablosu bulunamadı");
  });
  it("eksik alanları Türkçe adıyla listeler", () => {
    const s = fill.summarize([{ gridFound: true, filled: 15, missing: [{ row: 1, field: "documentType" }, { row: 3, field: "row" }] }], 3);
    expect(s.ok).toBe(false);
    expect(s.message).toContain("Alan bulunamadı: 1. satır BT, 3. satır (satır yok)");
    // Partial fill: the "Luca'da kaydettim" button must stay reachable so the receipt is not exported twice.
    expect(s.gridFound).toBe(true);
    expect(s.message).toContain("+ ile boş satır");
  });
  it("fazladan dolu satır varsa uyarır", () => {
    const s = fill.summarize([{ gridFound: true, filled: 18, missing: [], extraRows: 2 }], 3);
    expect(s.ok).toBe(false);
    expect(s.gridFound).toBe(true);
    expect(s.message).toContain("2 dolu satır daha var");
  });
  it("hepsi dolunca kullanıcıya Kaydet'i kendisinin basacağını söyler", () => {
    const s = fill.summarize([{ gridFound: false, filled: 0, missing: [] }, { gridFound: true, filled: 18, missing: [] }], 3);
    expect(s).toEqual({ ok: true, gridFound: true, message: "3 satır dolduruldu. Luca'da kontrol edip Kaydet'e siz basın, sonra eklentiyi yeniden açıp Luca'da kaydettim'e basın." });
  });
});

describe("seçici yapılandırması", () => {
  it("her alan için tek yerde seçici tanımlı", () => {
    expect(Object.keys(realSelectors.cells).sort()).toEqual([...fill.FIELDS].sort());
    expect(realSelectors.row).toBeTruthy();
  });
});
