import ExcelJS from "exceljs";
import type { JournalLine } from "../journal";

// The only place Luca column names live. Replace with the official "Şablon indir" headers when available.
export const LUCA_EXPORT_COLUMNS = [
  "Fiş No", "Fiş Tarihi", "Fiş Açıklama", "Hesap Kodu", "Evrak No", "Evrak Tarihi", "Detay Açıklama",
  "Borç", "Alacak", "Miktar", "Belge Türü", "Para Birimi", "Kur", "Döviz Tutar",
] as const;

export const MAX_RECEIPTS_PER_FILE = 50;
export const MAX_LINES_PER_FILE = 400;

export type ExportReceipt = { id: string; lines: JournalLine[] };

/** Splits into files of at most 50 receipts / 400 lines without splitting a receipt. */
export function chunkReceipts<T extends ExportReceipt>(receipts: readonly T[]): T[][] {
  const chunks: T[][] = [];
  let current: T[] = [];
  let lineCount = 0;
  for (const r of receipts) {
    if (current.length && (current.length === MAX_RECEIPTS_PER_FILE || lineCount + r.lines.length > MAX_LINES_PER_FILE)) {
      chunks.push(current);
      current = [];
      lineCount = 0;
    }
    current.push(r);
    lineCount += r.lines.length;
  }
  if (current.length) chunks.push(current);
  return chunks;
}

const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

export async function buildWorkbook(receipts: readonly ExportReceipt[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet("Fişler");
  sheet.addRow([...LUCA_EXPORT_COLUMNS]);
  receipts.forEach((r, i) => {
    const date = toDate(r.lines[0]?.documentDate ?? null);
    for (const l of r.lines) {
      // Kuruş -> TL only here, at the cell boundary.
      sheet.addRow([String(i + 1), date, r.lines[0].description, l.accountCode, l.documentNo, toDate(l.documentDate), l.description,
        l.debitKurus / 100, l.creditKurus / 100, l.quantity || null, l.documentType, "TL", null, null]);
    }
  });
  for (const col of [1, 4, 5]) sheet.getColumn(col).numFmt = "@";
  for (const col of [2, 6]) sheet.getColumn(col).numFmt = "dd.mm.yyyy";
  for (const col of [8, 9]) sheet.getColumn(col).numFmt = "#,##0.00";
  return Buffer.from(await wb.xlsx.writeBuffer());
}
