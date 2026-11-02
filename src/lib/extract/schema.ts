import { z } from "zod";
import { isValidTaxNumber, parseReceiptDate } from "../checks";
import { CATEGORY_KEYS } from "../default-rules";
import type { ReceiptData } from "../journal";
import { parseTrAmount, vatFromGross } from "../money";

// Amounts stay text exactly as printed ("8.725,00"); parseTrAmount converts them in tested code.
export const ReceiptExtractionSchema = z.object({
  vendorName: z.string().nullable().describe("Fişin en üstündeki satıcı unvanı, yazıldığı gibi"),
  taxOffice: z.string().nullable().describe("Vergi dairesi adı"),
  taxNumber: z.string().nullable().describe("VKN veya TCKN, sadece rakamlar"),
  date: z.string().nullable().describe("Fiş tarihi, yazıldığı gibi (GG.AA.YYYY)"),
  time: z.string().nullable(),
  receiptNo: z.string().nullable().describe("FİŞ NO, baştaki sıfırlarla"),
  zNo: z.string().nullable(),
  ekuNo: z.string().nullable(),
  vatLines: z.array(z.object({
    rate: z.number().int().describe("KDV oranı, yüzde (1, 10, 20, 0, eski fişte 8 veya 18)"),
    gross: z.string().nullable().describe("Bu orandaki KDV dahil tutar, yazıldığı gibi"),
    vat: z.string().nullable().describe("Bu orandaki KDV tutarı, yazıldığı gibi"),
  })).describe("Oran başına bir satır"),
  total: z.string().nullable().describe("TOPLAM, yazıldığı gibi"),
  paymentMethod: z.enum(["cash", "card", "other"]).describe("NAKİT ise cash, banka veya kredi kartı ise card"),
  category: z.enum(CATEGORY_KEYS).describe("Harcamanın türü"),
  unreadableFields: z.array(z.string()).describe("Okunamayan veya fişte olmayan alanların adları"),
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

/** Arithmetic and format checks; any problem triggers one retry with the stronger model. */
export function checkExtraction(x: ReceiptExtraction): string[] {
  const data = toReceiptData(x);
  const problems: string[] = [];
  if (data.totalKurus === null || data.vatLines.length !== x.vatLines.length) problems.push("amount_unreadable");
  else if (data.vatLines.reduce((s, v) => s + v.grossKurus, 0) !== data.totalKurus) problems.push("total_mismatch");
  if (data.vatLines.some((v) => v.vatKurus !== null && Math.abs(v.vatKurus - vatFromGross(v.grossKurus, v.rate)) > 1)) problems.push("vat_mismatch");
  if (x.taxNumber !== null && !isValidTaxNumber(x.taxNumber)) problems.push("tax_number_invalid");
  if (data.date === null) problems.push("date_invalid");
  return problems;
}
