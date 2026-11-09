import { SaxesParser } from "saxes";
import { unzip, ZipError } from "../zip";

/**
 * The cell values of an .xlsx, and nothing else. A general reader (exceljs) also builds merged ranges, validations, column
 * ranges and names, and one six-kilobyte file declaring a merge over A1:XFD1048576 makes it build billions of cells. This
 * reader never looks at those parts: it inflates the zip with hard caps, refuses DTDs, reads <c> values only, and stops at
 * a row and column limit, so its work is bounded by the file's own bytes.
 */
export type Cell = string | number | null;
export class XlsxError extends Error {}

const MAX_COLUMNS = 200;
const MAX_CELLS = 400_000; // across all sheets: a month's muavin has a few thousand
const MAX_TEXT = 1000; // per string and per cell: a muavin cell is a code, a date, a description or an amount

function parse(xml: string, on: { open: (name: string, attrs: Record<string, string>) => void; text: (t: string) => void; close: (name: string) => void }) {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new XlsxError("dtd");
  const parser = new SaxesParser({ xmlns: false });
  const local = (n: string) => n.slice(n.indexOf(":") + 1);
  parser.on("opentag", (node) => on.open(local(node.name), node.attributes as Record<string, string>));
  parser.on("text", on.text);
  parser.on("closetag", (node) => on.close(local(node.name)));
  parser.on("error", (e) => { throw e; });
  parser.write(xml).close();
}

const columnOf = (ref: string | undefined, fallback: number) => {
  const letters = /^([A-Z]{1,3})\d*$/.exec(ref ?? "")?.[1];
  if (!letters) return fallback;
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};

/** Each worksheet's rows (in sheet order), each row its cells by column (A = 0; sparse). Throws XlsxError on anything unreadable. */
export function readSheets(file: Buffer, { maxBytes, maxRows }: { maxBytes: number; maxRows: number }): Cell[][][] {
  let files: { name: string; data: Buffer }[];
  try {
    files = unzip(file, { maxFiles: 2000, maxFileBytes: maxBytes, maxTotalBytes: maxBytes });
  } catch (e) {
    throw e instanceof ZipError ? new XlsxError("zip") : e;
  }
  const byName = new Map(files.map((f) => [f.name, f.data.toString("utf8")]));

  const shared: string[] = [];
  const strings = byName.get("xl/sharedStrings.xml");
  if (strings) {
    let inT = false, current = "";
    try {
      parse(strings, {
        open: (n) => { if (n === "si") current = ""; if (n === "t") inT = true; },
        text: (t) => { if (inT && current.length < MAX_TEXT) current += t.slice(0, MAX_TEXT - current.length); },
        close: (n) => { if (n === "t") inT = false; if (n === "si") shared.push(current); },
      });
    } catch { throw new XlsxError("strings"); }
  }

  const sheets = [...byName.keys()].map((name) => [name, /^xl\/worksheets\/sheet(\d+)\.xml$/.exec(name)?.[1]] as const)
    .filter(([, n]) => n).sort((a, b) => Number(a[1]) - Number(b[1]));
  if (sheets.length === 0) throw new XlsxError("sheet");

  let rowCount = 0, cellCount = 0; // budgets for the whole workbook, not per sheet
  return sheets.map(([name]) => {
    const rows: Cell[][] = [];
    let row: Cell[] | null = null, col = 0, type = "", value = "", reading = false;
    try {
      parse(byName.get(name)!, {
        open: (n, a) => {
          if (n === "row") {
            if (++rowCount > maxRows) throw new XlsxError("rows");
            row = []; rows.push(row); col = 0;
          } else if (n === "c") {
            if (++cellCount > MAX_CELLS) throw new XlsxError("rows");
            col = columnOf(a.r, row ? row.length : 0); type = a.t ?? ""; value = "";
          } else if (n === "v" || (n === "t" && type === "inlineStr")) reading = true;
        },
        text: (t) => { if (reading && value.length < MAX_TEXT) value += t.slice(0, MAX_TEXT - value.length); },
        close: (n) => {
          if (n === "v" || n === "t") reading = false;
          if (n !== "c" || !row || col >= MAX_COLUMNS) return;
          let cell: Cell = null;
          if (type === "s") cell = shared[Number(value)] ?? null;
          else if (type === "inlineStr" || type === "str" || type === "b") cell = value;
          else if (type !== "e" && value !== "") { const v = Number(value); cell = Number.isFinite(v) ? v : null; }
          row[col] = cell;
        },
      });
    } catch (e) {
      throw e instanceof XlsxError ? e : new XlsxError("sheet");
    }
    return rows; // sparse: a cell never written is a hole, never a filled slot
  });
}

/** An Excel date serial (days since 1899-12-30) as yyyy-mm-dd, or null outside a plausible range. */
export function serialDate(v: number): string | null {
  if (!(v > 20_000 && v < 80_000)) return null; // 1954-2119
  return new Date(Date.UTC(1899, 11, 30) + Math.floor(v) * 86_400_000).toISOString().slice(0, 10);
}
