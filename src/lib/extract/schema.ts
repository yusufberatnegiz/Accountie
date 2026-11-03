import { z } from "zod";
import { isValidTaxNumber, parseReceiptDate } from "../checks";
import { CATEGORY_KEYS } from "../default-rules";
import type { ReceiptData } from "../journal";
import { parseTrAmount, vatFromGross } from "../money";

// Amounts stay text exactly as printed ("8.725,00"); parseTrAmount converts them in tested code.
export const ReceiptExtractionSchema = z.object({
  vendorName: z.string().max(200).nullable().describe("Fişin en üstündeki satıcı unvanı, yazıldığı gibi"),
  taxOffice: z.string().max(200).nullable().describe("Vergi dairesi adı"),
  taxNumber: z.string().max(20).nullable().describe("VKN veya TCKN, sadece rakamlar"),
  date: z.string().max(40).nullable().describe("Fiş tarihi, yazıldığı gibi (GG.AA.YYYY)"),
  time: z.string().max(40).nullable(),
  receiptNo: z.string().max(40).nullable().describe("FİŞ NO, baştaki sıfırlarla"),
  zNo: z.string().max(40).nullable(),
  ekuNo: z.string().max(40).nullable(),
  vatLines: z.array(z.object({
    rate: z.number().int().min(0).max(100).describe("KDV oranı, yüzde (1, 10, 20, 0, eski fişte 8 veya 18)"),
    gross: z.string().max(40).nullable().describe("Bu orandaki KDV dahil tutar, yazıldığı gibi"),
    vat: z.string().max(40).nullable().describe("Bu orandaki KDV tutarı, yazıldığı gibi"),
  })).max(10).describe("Oran başına bir satır"),
  total: z.string().max(40).nullable().describe("TOPLAM, yazıldığı gibi"),
  paymentMethod: z.enum(["cash", "card", "other"]).describe("NAKİT ise cash, banka veya kredi kartı ise card"),
  category: z.enum(CATEGORY_KEYS).describe("Harcamanın türü"),
  unreadableFields: z.array(z.string().max(100)).max(30).describe("Okunamayan veya fişte olmayan alanların adları"),
});

export type ReceiptExtraction = z.infer<typeof ReceiptExtractionSchema>;

function amountOrNull(text: string | null): number | null {
  if (text === null) return null;
  try {
    return parseTrAmount(text);
  } catch {
    return null;
  }
}

export function toReceiptData(x: ReceiptExtraction): ReceiptData {
  return {
    vendorName: x.vendorName,
    receiptNo: x.receiptNo,
    date: x.date === null ? null : parseReceiptDate(x.date),
    vatLines: x.vatLines.flatMap((v) => {
      const grossKurus = amountOrNull(v.gross);
      return grossKurus === null ? [] : [{ rate: v.rate, grossKurus, vatKurus: amountOrNull(v.vat) }];
    }),
    totalKurus: amountOrNull(x.total),
    paymentMethod: x.paymentMethod,
    category: x.category,
  };
}

const DAY_MS = 86_400_000;

/** Not in the future (one day of slack for time zones) and not older than a year: catches a misread year digit. */
function isPlausibleDate(isoDate: string, today: Date): boolean {
  const t = Date.parse(isoDate);
  return t <= today.getTime() + DAY_MS && t >= today.getTime() - 366 * DAY_MS;
}

/** Arithmetic and format checks; any problem triggers one retry with the stronger model. */
export function checkExtraction(x: ReceiptExtraction, today = new Date()): string[] {
  const data = toReceiptData(x);
  const problems: string[] = [];
  if (data.totalKurus === null || data.vatLines.length !== x.vatLines.length) problems.push("amount_unreadable");
  else if (data.vatLines.reduce((s, v) => s + v.grossKurus, 0) !== data.totalKurus) problems.push("total_mismatch");
  if (data.vatLines.some((v) => v.vatKurus !== null && Math.abs(v.vatKurus - vatFromGross(v.grossKurus, v.rate)) > 1)) problems.push("vat_mismatch");
  if (x.taxNumber !== null && !isValidTaxNumber(x.taxNumber)) problems.push("tax_number_invalid");
  if (data.date === null) problems.push("date_invalid");
  else if (!isPlausibleDate(data.date, today)) problems.push("date_unusual");
  // The model may flag a field as unsure yet still fill it; treat that as a problem so it is retried and highlighted.
  // Matched by prefix, so "vatLines[0].vat" or "paymentMethod " count too.
  const unsure = (field: string) => x.unreadableFields.some((f) => f.trim().toLowerCase().startsWith(field.toLowerCase()));
  const add = (code: string) => !problems.includes(code) && problems.push(code);
  if (unsure("total")) add("amount_unreadable");
  if (unsure("vatLines") && x.vatLines.length > 0) add("vat_mismatch");
  if (unsure("date")) add("date_invalid");
  if (unsure("paymentMethod")) add("payment_unsure");
  if (unsure("receiptNo")) add("receipt_no_unsure");
  return problems;
}
