import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../default-rules";
import { buildJournalLines } from "../journal";
import { lucaGridRows } from "./clipboard";
import "../../../extension/fill.js";
import "../../../extension/selectors.js";

type FakeEl = { value: string; events: string[]; dispatchEvent(e: Event): boolean; focus(): void };
type Fill = {
  FIELDS: string[];
  fillReceipt(doc: unknown, rows: unknown[], sel: Selectors): { gridFound: boolean; filled: number; missing: { row: number; field: string }[]; extraRows: number; start: number };
  summarize(results: unknown[], rowCount: number): { ok: boolean; gridFound: boolean; message: string };
  readGrid(doc: unknown, sel: Selectors, start?: number): Record<string, string>[] | null;
  checkGrid(expected: unknown[], actual: Record<string, string>[] | null): string[];
};
type Selectors = { row: string; addRow: string | null; save?: string | null; saved?: string | null; newEntry?: string | null; cells: Record<string, string> };

const { AccountieFill: fill, AccountieSelectors: realSelectors } = globalThis as unknown as { AccountieFill: Fill; AccountieSelectors: Selectors };

const { lines } = buildJournalLines({
  vendorName: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", receiptNo: "0047", date: "2026-09-05",
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
      { accountCode: "770.08", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", debit: "7.931,82", credit: "", taxNumber: "" },
      { accountCode: "191.03.10", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", debit: "793,18", credit: "", taxNumber: "" },
      { accountCode: "331.01", documentNo: "0047", documentDate: "05/09/2026", documentType: "ÖK", description: "ÖRNEK BALIK LOKANTASI VE RES.İŞL.LTD.ŞTİ", debit: "", credit: "8.725,00", taxNumber: "" },
    ]);
  });
  it("satıcı VKN'si yalnız gider satırına yazılır; KDV ve ödeme satırında boş kalır", () => {
    expect(lucaGridRows(lines, "1234567890").map((r) => r.taxNumber)).toEqual(["1234567890", "", ""]);
  });
});

describe("eklenti satır doldurma", () => {
  it("Luca'nın boş satırdaki 0,00 tutarlarını dolu saymaz: yazmaya en üstteki boş satırdan başlar", () => {
    const doc = fakeDoc(3);
    for (const r of doc.grid) { r.cells[".debit"].value = "0,00"; r.cells[".credit"].value = "0,00"; }
    expect(fill.fillReceipt(doc, rows, SEL).start).toBe(0);
    expect(doc.grid[0].cells[".accountCode"].value).toBe("770.08");
    const empty = fakeDoc(2);
    for (const r of empty.grid) r.cells[".debit"].value = "0,00";
    expect(fill.readGrid(empty, SEL)).toEqual([]);
  });

  it("önceki fişlerin arasında 0,00'lı boş satır olsa da yeni fiş kendi satırından okunur, yanlış alarm vermez", () => {
    const doc = fakeDoc(3);
    doc.grid[0].cells[".accountCode"].value = "770.10";
    doc.grid[1].cells[".debit"].value = "0,00";
    doc.grid[2].cells[".accountCode"].value = "309.01";
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(result.start).toBe(3);
    expect(fill.checkGrid(rows, fill.readGrid(doc, SEL, result.start))).toEqual([]);
  });

  it("üç satırı doldurur, boş tutarı yazmaz, input/change olaylarını tetikler", () => {
    const doc = fakeDoc(3);
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(result).toEqual({ gridFound: true, filled: 18, missing: [], extraRows: 0, start: 0 });
    expect(doc.grid[0].cells[".accountCode"].value).toBe("770.08");
    expect(doc.grid[0].cells[".debit"].value).toBe("7.931,82");
    expect(doc.grid[0].cells[".credit"].value).toBe("");
    expect(doc.grid[2].cells[".credit"].value).toBe("8.725,00");
    expect(doc.grid[0].cells[".documentNo"].events).toEqual(["input", "change", "blur"]);
  });

  it("tabloda önceki fiş varsa yenisini altına yazar, öncekine dokunmaz", () => {
    const doc = fakeDoc(4);
    fill.fillReceipt(doc, rows, SEL);
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(result.start).toBe(3);
    expect(result.missing).toEqual([]);
    expect(doc.grid).toHaveLength(6);
    expect(doc.grid[2].cells[".credit"].value).toBe("8.725,00");
    expect(doc.grid[3].cells[".accountCode"].value).toBe("770.08");
    expect(doc.grid[5].cells[".credit"].value).toBe("8.725,00");
    expect(fill.checkGrid(rows, fill.readGrid(doc, SEL)!.slice(result.start))).toEqual([]);
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

  it("aşağıda dolu bir satır varsa onun da altına yazar, hiçbir dolu satırı ezmez", () => {
    const doc = fakeDoc(5);
    doc.grid[4].cells[".debit"].value = "100,00";
    const result = fill.fillReceipt(doc, rows, SEL);
    expect(result.start).toBe(5);
    expect(doc.grid[4].cells[".debit"].value).toBe("100,00");
    expect(doc.grid[0].cells[".accountCode"].value).toBe("");
  });

  it("tablo yoksa gridFound false döner", () => {
    expect(fill.fillReceipt(fakeDoc(0), rows, SEL)).toEqual({ gridFound: false, filled: 0, missing: [], extraRows: 0, start: 0 });
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
  it("önceki fişin altına yazıldıysa bunu söyler", () => {
    expect(fill.summarize([{ gridFound: true, filled: 18, missing: [], start: 3 }], 3).message).toContain("3 satır dolduruldu (önceki 3 satırın altına).");
  });
  it("hepsi dolunca kullanıcıya Kaydet'i kendisinin basacağını söyler", () => {
    const s = fill.summarize([{ gridFound: false, filled: 0, missing: [] }, { gridFound: true, filled: 18, missing: [] }], 3);
    expect(s).toEqual({ ok: true, gridFound: true, start: 0, message: "3 satır dolduruldu. Luca'da kontrol edip Kaydet'e siz basın, sonra eklentiyi yeniden açıp Luca'da kaydettim'e basın." });
  });
});

describe("kaydetmeden önce ekranı geri okuma", () => {
  const filledDoc = () => { const doc = fakeDoc(4); fill.fillReceipt(doc, rows, SEL); return doc; };

  it("doğru doldurulmuş ekranda fark bulmaz; boş satırları saymaz", () => {
    const grid = fill.readGrid(filledDoc(), SEL);
    expect(grid).toHaveLength(3);
    expect(fill.checkGrid(rows, grid)).toEqual([]);
  });

  it("Luca tutarı noktasız ya da ondalık noktalı gösterse de aynı sayar", () => {
    const doc = filledDoc();
    doc.grid[0].cells[".debit"].value = "7931.82";
    doc.grid[2].cells[".credit"].value = "8725,00";
    expect(fill.checkGrid(rows, fill.readGrid(doc, SEL))).toEqual([]);
  });

  it("değişen tutarı, hesap kodunu ve dengesiz toplamı satırıyla söyler", () => {
    const doc = filledDoc();
    doc.grid[1].cells[".debit"].value = "79,31";
    doc.grid[0].cells[".accountCode"].value = "770.01";
    expect(fill.checkGrid(rows, fill.readGrid(doc, SEL))).toEqual([
      "1. satır hesap kodu 770.01, 770.08 bekleniyordu.",
      "2. satır Borç 79,31, 793,18 bekleniyordu.",
      "Ekrandaki borç ve alacak toplamları eşit değil.",
    ]);
  });

  it("fazla ya da eksik satırı sayar", () => {
    const doc = filledDoc();
    doc.grid[3].cells[".debit"].value = "100,00";
    expect(fill.checkGrid(rows, fill.readGrid(doc, SEL))[0]).toBe("Ekranda 4 satır var, 3 satır bekleniyordu.");
    expect(fill.checkGrid(rows, fill.readGrid(fakeDoc(3), SEL))[0]).toBe("Ekranda 0 satır var, 3 satır bekleniyordu.");
  });

  it("tablo okunamazsa kaydetmeye izin vermez", () => {
    expect(fill.readGrid(fakeDoc(0), SEL)).toBeNull();
    expect(fill.checkGrid(rows, null)).toEqual(["Fiş Detayı tablosu okunamadı."]);
  });
});

describe("seçici yapılandırması", () => {
  it("kayıt işareti Luca'da doğrulanana kadar boş: üçü birden olmadan eklenti kendiliğinden Kaydet'e basmaz", () => {
    expect(realSelectors.saved).toBeNull();
  });

  it("her alan için tek yerde seçici tanımlı", () => {
    expect(Object.keys(realSelectors.cells).sort()).toEqual([...fill.FIELDS].sort());
    expect(realSelectors.row).toBeTruthy();
  });
});
