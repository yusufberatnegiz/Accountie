import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "../default-rules";
import { buildJournalLines, type JournalLine } from "../journal";
import { clipboardText } from "./clipboard";
import { buildWorkbook, chunkReceipts, LUCA_EXPORT_COLUMNS, type ExportReceipt } from "./export";

const { lines } = buildJournalLines({
  vendorName: "ARKADAŞ ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ",
  receiptNo: "0047",
  date: "2026-09-05",
  vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }],
  totalKurus: 872500,
  paymentMethod: "card",
  category: "meal",
}, DEFAULT_RULES);

const receipt = (id: string, lineCount = 3): ExportReceipt => ({ id, lines: Array.from({ length: lineCount }, (_, i) => lines[i % 3]) });

async function readBack(buffer: Buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ArrayBuffer);
  return wb.worksheets[0];
}

describe("buildWorkbook", () => {
  it("başlıkları sabitle aynı, Evrak No metin, tarih tarih, tutar sayı yazar", async () => {
    const sheet = await readBack(await buildWorkbook([receipt("a"), receipt("b")]));
    expect((sheet.getRow(1).values as unknown[]).slice(1)).toEqual([...LUCA_EXPORT_COLUMNS]);
    const row = (n: number) => Object.fromEntries(LUCA_EXPORT_COLUMNS.map((c, i) => [c, sheet.getRow(n).getCell(i + 1).value]));
    expect(row(2)).toMatchObject({
      "Fiş No": "1",
      "Fiş Açıklama": "arkadaş alabalık üretim çiftliği",
      "Hesap Kodu": "770.08",
      "Evrak No": "0047",
      "Detay Açıklama": "arkadaş alabalık üretim çiftliği",
      Borç: 7931.82,
      Alacak: 0,
      "Belge Türü": "ÖK",
      "Para Birimi": "TL",
    });
    expect(row(2)["Evrak Tarihi"]).toEqual(new Date(Date.UTC(2026, 8, 5)));
    expect(row(4)).toMatchObject({ "Hesap Kodu": "331.01", Borç: 0, Alacak: 8725 });
    expect(row(5)["Fiş No"]).toBe("2");
    expect(sheet.getRow(2).getCell(5).numFmt).toBe("@");
    expect(sheet.rowCount).toBe(7);
  });
});

describe("chunkReceipts", () => {
  it("51 fişi iki dosyaya böler", () => {
    const chunks = chunkReceipts(Array.from({ length: 51 }, (_, i) => receipt(String(i))));
    expect(chunks.map((c) => c.length)).toEqual([50, 1]);
  });
  it("400 satırı aşacak fişi yeni dosyaya alır, fişi bölmez", () => {
    const chunks = chunkReceipts([receipt("a", 398), receipt("b", 3), receipt("c", 2)]);
    expect(chunks.map((c) => c.map((r) => r.id))).toEqual([["a"], ["b", "c"]]);
  });
});

describe("clipboardText", () => {
  it("Fiş Detayı sırasında sekmeyle ayrılmış satırlar üretir", () => {
    expect(clipboardText(lines as JournalLine[])).toBe([
      "770.08\t0047\t05/09/2026\tÖK\tarkadaş alabalık üretim çiftliği\t7.931,82\t",
      "191.03.10\t0047\t05/09/2026\tÖK\tarkadaş alabalık üretim çiftliği\t793,18\t",
      "331.01\t0047\t05/09/2026\tÖK\tarkadaş alabalık üretim çiftliği\t\t8.725,00",
    ].join("\n"));
  });
});
