import ExcelJS from "exceljs";
import { parseTrAmount } from "../money";
import { unzippedSize } from "../zip";

/**
 * Luca muavin (sub-ledger) export, read without knowing its exact layout: the header row is found by its column names, and the
 * account code comes from a "Hesap Kodu" column or, when the export groups by account, from the account's title row above.
 * shortcut: the layout is guessed from common Luca exports (no sample file yet); a column named otherwise is reported, not guessed.
 */
export type MuavinRow = { accountCode: string | null; documentNo: string; date: string | null; debitKurus: number; creditKurus: number };

export class MuavinError extends Error {}

const MAX_ROWS = 20_000;
const key = (s: string) => s.toLocaleLowerCase("tr").replace(/[^a-zçğıöşü]/g, "").replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u");
// Header names per field, best first. Luca's own "Fiş No" is its journal number, not the receipt's Evrak No, so it is never used.
const HEADERS = {
  documentNo: ["evrakno", "belgeno", "evraknumarasi", "belgenumarasi"],
  debit: ["borc", "borctutari", "borctl"],
  credit: ["alacak", "alacaktutari", "alacaktl"],
  account: ["hesapkodu", "hesapno", "hesap"],
  date: ["evraktarihi", "belgetarihi", "tarih", "fistarihi"],
} as const;
const ACCOUNT_TITLE = /^\s*(\d{3}(?:\.\d{1,3}){0,4})\b/;

function text(v: ExcelJS.CellValue): string {
  if (v == null) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object") {
    if ("result" in v && v.result != null) return text(v.result as ExcelJS.CellValue);
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
    if ("text" in v) return String(v.text);
    return "";
  }
  return String(v).trim();
}

function kurus(v: ExcelJS.CellValue): number | null {
  if (v == null || v === "") return 0;
  if (typeof v === "number") return Math.round(v * 100);
  if (typeof v === "object" && v !== null && "result" in v) return kurus(v.result as ExcelJS.CellValue);
  const t = text(v);
  if (!t) return 0;
  try { return parseTrAmount(t.replace(/^-/, "")); } catch { return null; }
}

function isoDate(v: ExcelJS.CellValue): string | null {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  const m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text(v));
  return m ? `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}` : null;
}

const MAX_UNZIPPED = 60 * 1024 * 1024;
/** The rows of the first sheet that carries an Evrak No, Borç and Alacak header. Throws MuavinError (Turkish) when none does. */
export async function readMuavin(file: Buffer): Promise<MuavinRow[]> {
  if (unzippedSize(file) > MAX_UNZIPPED) throw new MuavinError("Dosya açılamadı ya da çok büyük. Luca'dan tek ayın muavinini Excel (.xlsx) olarak indirin.");
  const book = new ExcelJS.Workbook();
  try {
    await book.xlsx.load(file as unknown as ArrayBuffer);
  } catch {
    throw new MuavinError("Dosya açılamadı. Luca'dan Excel (.xlsx) olarak indirdiğiniz muavini yükleyin.");
  }
  for (const sheet of book.worksheets) {
    let cols: Partial<Record<keyof typeof HEADERS, number>> | null = null;
    let account: string | null = null;
    const rows: MuavinRow[] = [];
    let n = 0;
    sheet.eachRow((row) => {
      if (++n > MAX_ROWS) throw new MuavinError(`Dosyada ${MAX_ROWS} satırdan fazlası var. Bir ayı ayrı indirin.`);
      const cells = (row.values as ExcelJS.CellValue[]).slice(1);
      if (!cols) {
        const keys = cells.map((c) => key(text(c)));
        const found: Partial<Record<keyof typeof HEADERS, number>> = {};
        for (const [field, names] of Object.entries(HEADERS) as [keyof typeof HEADERS, readonly string[]][]) {
          const i = names.map((name) => keys.indexOf(name)).find((x) => x >= 0);
          if (i !== undefined) found[field] = i;
        }
        if (found.documentNo !== undefined && found.debit !== undefined && found.credit !== undefined) cols = found;
        else { const title = ACCOUNT_TITLE.exec(text(cells[0])); if (title) account = title[1]; }
        return;
      }
      const doc = text(cells[cols.documentNo!]);
      const debit = kurus(cells[cols.debit!]);
      const credit = kurus(cells[cols.credit!]);
      // A title row of the next account (grouped exports), or a total line: no evrak no, so not a posting.
      if (!doc) { const title = ACCOUNT_TITLE.exec(text(cells[0])); if (title && cols.account === undefined) account = title[1]; return; }
      if (debit === null || credit === null) return;
      rows.push({
        accountCode: cols.account !== undefined ? (ACCOUNT_TITLE.exec(text(cells[cols.account]))?.[1] ?? null) : account,
        documentNo: doc,
        date: cols.date !== undefined ? isoDate(cells[cols.date]) : null,
        debitKurus: debit,
        creditKurus: credit,
      });
    });
    if (cols) return rows;
  }
  throw new MuavinError("Dosyada Evrak No, Borç ve Alacak sütunları bulunamadı. Luca'da muavini bu sütunlarla Excel'e aktarın.");
}

export type ReceiptForCheck = { id: string; vendorName: string | null; documentNo: string; lines: { accountCode: string; debitKurus: number; creditKurus: number }[] };
export type CheckLine = { accountCode: string; expectedKurus: number; foundKurus: number | null };
export type CheckResult =
  | { kind: "uyuyor"; receipt: ReceiptForCheck }
  | { kind: "yok"; receipt: ReceiptForCheck }
  | { kind: "fark"; receipt: ReceiptForCheck; lines: CheckLine[] };
export type Reconciliation = { results: CheckResult[]; extra: MuavinRow[]; accounts: string[] };

// "0412" in Accountie and "412" in Luca are the same evrak.
const docKey = (s: string) => s.trim().replace(/^0+(?=\d)/, "").toLocaleUpperCase("tr");
const amount = (l: { debitKurus: number; creditKurus: number }) => l.debitKurus || l.creditKurus;
/** Same account: equal, or one is the other's group (a 191 muavin against 191.03.10). */
const sameAccount = (a: string, b: string) => a === b || a.startsWith(`${b}.`) || b.startsWith(`${a}.`);

/**
 * Accountie's receipts against the muavin. Only accounts the muavin covers are compared (a 191 muavin checks 191 lines; one
 * without account codes checks every line by amount). A receipt matches when each compared line has a row with its evrak no,
 * account and amount; it is missing when no row carries its evrak no; otherwise the differing lines are listed.
 * Rows whose evrak no is in no receipt are returned as `extra` (entered in Luca another way).
 */
export function reconcile(receipts: readonly ReceiptForCheck[], rows: readonly MuavinRow[]): Reconciliation {
  const accounts = [...new Set(rows.flatMap((r) => (r.accountCode ? [r.accountCode] : [])))].sort();
  const covered = (code: string) => accounts.length === 0 || accounts.some((a) => sameAccount(code, a));
  const byDoc = new Map<string, MuavinRow[]>();
  for (const r of rows) byDoc.set(docKey(r.documentNo), [...(byDoc.get(docKey(r.documentNo)) ?? []), r]);
  const seen = new Set<string>();

  const results: CheckResult[] = receipts.map((receipt) => {
    const k = docKey(receipt.documentNo);
    const found = byDoc.get(k);
    if (!found) return { kind: "yok", receipt };
    seen.add(k);
    const lines = receipt.lines.filter((l) => amount(l) > 0 && covered(l.accountCode)).map((l): CheckLine => {
      const candidates = found.filter((r) => !r.accountCode || sameAccount(r.accountCode, l.accountCode));
      const exact = candidates.find((r) => amount(r) === amount(l) && (l.debitKurus > 0) === (r.debitKurus > 0));
      return { accountCode: l.accountCode, expectedKurus: amount(l), foundKurus: exact ? amount(exact) : candidates[0] ? amount(candidates[0]) : null };
    });
    const off = lines.filter((l) => l.foundKurus !== l.expectedKurus);
    return off.length ? { kind: "fark", receipt, lines: off } : { kind: "uyuyor", receipt };
  });
  const extra = rows.filter((r) => !seen.has(docKey(r.documentNo)) && !receipts.some((x) => docKey(x.documentNo) === docKey(r.documentNo)));
  return { results, extra, accounts };
}
