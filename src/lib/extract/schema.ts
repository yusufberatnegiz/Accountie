import { z } from "zod";
import { isValidTaxNumber, parseReceiptDate } from "../checks";
import { CATEGORY_KEYS } from "../default-rules";
import type { ReceiptData } from "../journal";
import type { ForeignData, SalesData } from "../journal-kinds";
import { parseTrAmount, vatFromGross } from "../money";

// Amounts stay text exactly as printed ("8.725,00"); parseTrAmount converts them in tested code.
export const DOCUMENT_KINDS = ["receipt", "z_report", "foreign_invoice", "domestic_invoice"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

export const ReceiptExtractionSchema = z.object({
  documentKind: z.enum(DOCUMENT_KINDS).describe("receipt: yazar kasa (ÖKC) satış fişi. z_report: yazar kasanın gün sonu Z raporu. foreign_invoice: yurt dışı şirketin (Google, Meta, AWS, yazılım aboneliği gibi) faturası veya ödeme makbuzu. domestic_invoice: Türkiye'de kesilmiş e-fatura, e-arşiv fatura veya kâğıt fatura (uçak, otobüs, tren bileti, otel, hizmet faturası)"),
  vendorName: z.string().max(200).nullable().describe("Fişin en üstündeki satıcı unvanı, yazıldığı gibi"),
  taxOffice: z.string().max(200).nullable().describe("Vergi dairesi adı"),
  taxNumber: z.string().max(20).nullable().describe("Satıcının VKN veya TCKN'si, sadece rakamlar. Faturada alıcının (SAYIN) numarası değil"),
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
  total: z.string().max(40).nullable().describe("TOPLAM, yazıldığı gibi. Z raporunda günün genel toplamı. Yurt dışı faturada ödenecek toplam"),
  currency: z.string().max(3).nullable().describe("Para birimi, ISO kodu (TRY, USD, EUR...). Fiş ve Z raporunda TRY"),
  cashTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: nakit tahsilat toplamı"),
  cardTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: kredi kartı ile tahsilat toplamı"),
  invoicedTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: faturalı satış toplamı, yazıyorsa"),
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

/** A foreign service invoice as read (src/lib/journal-kinds.ts). Amounts stay in the invoice currency. */
export function toForeignData(x: ReceiptExtraction): ForeignData {
  const vat = x.vatLines.reduce((s, v) => s + (amountOrNull(v.vat) ?? 0), 0);
  // Not read: no currency, so no TL amount is guessed (a USD invoice must never pass as TL); the reviewer enters it.
  const currency = x.currency && /^[A-Z]{3}$/.test(x.currency) ? x.currency : "";
  return {
    vendorName: x.vendorName,
    invoiceNo: x.receiptNo,
    date: x.date === null ? null : parseReceiptDate(x.date),
    currency,
    totalMinor: amountOrNull(x.total),
    vatMinor: vat,
    paymentMethod: x.paymentMethod,
  };
}

/** A Z report as read. */
export function toSalesData(x: ReceiptExtraction): SalesData {
  const data = toReceiptData(x);
  return { vendorName: x.vendorName, zNo: x.zNo, date: data.date, vatLines: data.vatLines, totalKurus: data.totalKurus, cashKurus: amountOrNull(x.cashTotal), cardKurus: amountOrNull(x.cardTotal), invoicedKurus: amountOrNull(x.invoicedTotal) };
}

/** Older reads (before Z reports and foreign invoices) have no kind: they are receipts. */
export const kindOf = (x: { documentKind?: DocumentKind | null } | null | undefined): DocumentKind => x?.documentKind ?? "receipt";

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
  const kind = kindOf(x);
  const problems: string[] = [];
  if (data.totalKurus === null || data.vatLines.length !== x.vatLines.length) problems.push("amount_unreadable");
  // A foreign invoice usually shows no KDV at all; its total stands alone.
  else if (kind !== "foreign_invoice" && data.vatLines.reduce((s, v) => s + v.grossKurus, 0) !== data.totalKurus) problems.push("total_mismatch");
  if (kind === "foreign_invoice" && !/^[A-Z]{3}$/.test(x.currency ?? "")) problems.push("currency_unsure");
  if (kind === "z_report" && data.totalKurus !== null) {
    const cash = amountOrNull(x.cashTotal), card = amountOrNull(x.cardTotal);
    if (cash === null && card === null) problems.push("z_payment_split");
    else if (cash !== null && card !== null && cash + card !== data.totalKurus) problems.push("z_payment_split");
  }
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
