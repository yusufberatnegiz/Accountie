import { z } from "zod";
import { isValidTaxNumber, parseReceiptDate } from "../checks";
import { CATEGORY_KEYS } from "../default-rules";
import type { ReceiptData, VatLine } from "../journal";
import type { ForeignData, SalesData } from "../journal-kinds";
import { parseTrAmount, vatFromGross } from "../money";

// Amounts stay text exactly as printed ("8.725,00"); parseTrAmount converts them in tested code.
export const DOCUMENT_KINDS = ["receipt", "z_report", "foreign_invoice", "domestic_invoice"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

// The model chooses only by these words; without them a bag of nuts once landed on office supplies (küçük demirbaş).
const CATEGORY_GUIDE = `Harcamanın türü, fişteki ürünlere ve satıcıya göre:
fuel: akaryakıt, benzin, motorin, LPG, şarj. stationery: kırtasiye, kağıt, kalem, toner, kitap. cargo: kargo, posta, PTT.
parking: otopark, köprü, otoyol, HGS, OGS. transport: taksi, otobüs, uçak, tren bileti. cleaning: deterjan, çamaşır suyu, temizlik malzemesi.
maintenance: araç veya işyeri bakım, tamir, servis, yedek parça. meal: lokanta, restoran, kafe, yemek, ağırlama.
telecom: telefon, internet, GSM faturası. lodging: otel, konaklama.
office_supplies: dayanıklı büro eşyası (sandalye, dosya dolabı, mouse, klavye, uzatma kablosu gibi küçük demirbaş).
food_grocery: market ve mutfak: çay, kahve, şeker, su, kuruyemiş, bisküvi, meyve, süt, ekmek gibi yiyecek ve içecek.
other: bunların hiçbiri. Yiyecek ve içecek hiçbir zaman office_supplies değildir. Ürünler karışıksa tutarı en büyük olanın türünü seç.`;

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
    net: z.string().max(40).nullable().describe("Bu orandaki KDV hariç tutar (matrah), yalnız belge oran başına KDV dahil tutar yazmıyorsa (e-fatura); yoksa null"),
  })).max(10).describe("Oran başına bir satır"),
  lineItems: z.array(z.object({
    rate: z.number().int().min(0).max(100).describe("Ürünün KDV oranı (%01 ise 1, %20 ise 20)"),
    amount: z.string().max(40).describe("Ürün satırının tutarı, yazıldığı gibi"),
  })).max(80).describe("Yalnız fişte oran bazlı KDV dahil toplamlar yazmıyorsa: her ürün satırı, oranı ve tutarıyla. Kırılım yazıyorsa boş"),
  discounts: z.array(z.object({
    rate: z.number().int().min(0).max(100).nullable().describe("İndirimin uygulandığı ürünün KDV oranı; sepetin tamamına yapılan indirimde null"),
    amount: z.string().max(40).describe("İndirim tutarı, eksi işareti ve -D olmadan"),
  })).max(30).describe("İndirim satırları (Ürün İndirimleri, İNDİRİM, İSKONTO, kampanya; tutarın sonunda -D)"),
  totalVat: z.string().max(40).nullable().describe("TOPKDV veya TOPLAM KDV, yazıldığı gibi"),
  total: z.string().max(40).nullable().describe("TOPLAM, yazıldığı gibi. Z raporunda günün genel toplamı. Yurt dışı faturada ödenecek toplam"),
  currency: z.string().max(3).nullable().describe("Para birimi, ISO kodu (TRY, USD, EUR...). Fiş ve Z raporunda TRY"),
  cashTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: nakit tahsilat toplamı"),
  cardTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: kredi kartı ile tahsilat toplamı"),
  invoicedTotal: z.string().max(40).nullable().describe("Yalnız Z raporu: faturalı satış toplamı, yazıyorsa"),
  paymentMethod: z.enum(["cash", "card", "other"]).describe("NAKİT ise cash, banka veya kredi kartı ise card"),
  payments: z.array(z.object({
    method: z.enum(["cash", "card", "other"]).describe("NAKİT cash; kredi veya banka kartı card; puan, hediye çeki, yemek kartı, açık hesap other"),
    amount: z.string().max(40).describe("Bu ödeme şekliyle ödenen tutar, yazıldığı gibi"),
  })).max(6).describe("Fişte birden çok ödeme şekli varsa (nakit + kart, puan, hediye çeki, yemek kartı) her biri tutarıyla; tek ödeme şeklinde boş"),
  category: z.enum(CATEGORY_KEYS).describe(CATEGORY_GUIDE),
  noFiscalValue: z.boolean().describe("Belgede 'MALİ DEĞERİ YOKTUR' yazıyorsa true (sipariş belgesi, e-adisyon, yemek kartı ödeme belgesi, bilgi slibi)"),
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

const sumGross = (ls: readonly VatLine[]) => ls.reduce((s, v) => s + v.grossKurus, 0);
/** How many kuruş TOPKDV may differ from KDV worked out per rate: one per rate, or half a kuruş per item when KDV is rounded per item. */
const vatTolerance = (x: ReceiptExtraction, rates: number) => Math.max(rates, Math.ceil((x.lineItems?.length ?? 0) / 2));

/** An item amount that may be a cancelled line: "-30,00", "30,00-" or "30,00-D" is minus 30,00. */
function signedAmount(text: string): number | null {
  const minus = /^\s*-|-\s*D?\s*$/i.test(text);
  const k = amountOrNull(text.replace(/^\s*-/, "").replace(/-\s*D?\s*$/i, ""));
  return k === null ? null : minus ? -k : k;
}

/** Amounts per KDV rate; null when one of them cannot be read. Discounts count as positive amounts to take off. */
function byRate(rows: readonly { rate: number | null; amount: string }[], discounts = false): Map<number | null, number> | null {
  const out = new Map<number | null, number>();
  for (const r of rows) {
    const signed = signedAmount(r.amount);
    const k = signed === null ? null : discounts ? Math.abs(signed) : signed;
    if (k === null) return null;
    out.set(r.rate, (out.get(r.rate) ?? 0) + k);
  }
  return out;
}

/** Takes the discounts off per-rate gross amounts; a whole-basket discount (rate null) is shared out in proportion (largest remainder). */
function lessDiscounts(gross: Map<number, number>, discounts: Map<number | null, number>): VatLine[] {
  const lines = [...gross].map(([rate, g]) => ({ rate, grossKurus: g - (discounts.get(rate) ?? 0), vatKurus: null as number | null }));
  const basket = discounts.get(null) ?? 0;
  const base = sumGross(lines);
  if (basket && base > 0) {
    const shares = lines.map((l) => Math.floor((basket * l.grossKurus) / base));
    let left = basket - shares.reduce((s, n) => s + n, 0);
    const order = lines.map((l, i) => [(basket * l.grossKurus) % base, i] as const).sort((a, b) => b[0] - a[0]);
    for (const [, i] of order) { if (!left) break; shares[i]++; left--; }
    lines.forEach((l, i) => { l.grossKurus -= shares[i]; });
  }
  return lines.filter((l) => l.grossKurus !== 0);
}

/**
 * Per-rate KDV-inclusive amounts. The printed breakdown when it adds up to the total; otherwise the item lines less their discounts
 * (a receipt that prints only TOPKDV), or the breakdown less the discounts (one printed before them). The model only copies figures;
 * the sums are made here.
 */
function vatLinesOf(x: ReceiptExtraction): VatLine[] {
  const printed = x.vatLines.flatMap((v) => {
    // An e-fatura prints per rate the matrah and the KDV, not their sum: the sum is made here.
    const net = amountOrNull(v.net ?? null), vat = amountOrNull(v.vat);
    const grossKurus = amountOrNull(v.gross) ?? (net !== null && vat !== null ? net + vat : null);
    return grossKurus === null ? [] : [{ rate: v.rate, grossKurus, vatKurus: vat }];
  });
  const total = amountOrNull(x.total);
  if (total === null || (printed.length && printed.length === x.vatLines.length && sumGross(printed) === total)) return printed;
  const discounts = byRate(x.discounts ?? [], true) ?? new Map<number | null, number>();
  const items = byRate(x.lineItems ?? []);
  const candidates: VatLine[][] = [];
  if (items?.size) candidates.push(lessDiscounts(items as Map<number, number>, discounts));
  if (printed.length && discounts.size) candidates.push(lessDiscounts(new Map(printed.map((v) => [v.rate, v.grossKurus])), discounts));
  const fits = candidates.find((c) => c.length && c.every((v) => v.grossKurus > 0) && sumGross(c) === total);
  // Nothing adds up: the printed breakdown, or an item split with no rate below zero, left for the checks to flag.
  if (!fits) return printed.length ? printed : candidates.find((c) => c.every((v) => v.grossKurus > 0)) ?? [];
  // TOPKDV, when it agrees with the KDV worked out per rate, confirms the split; otherwise the KDV stays "computed" and is flagged.
  const totalVat = amountOrNull(x.totalVat ?? null);
  const vats = fits.map((v) => vatFromGross(v.grossKurus, v.rate));
  const off = totalVat === null ? Infinity : totalVat - vats.reduce((s, n) => s + n, 0);
  if (Math.abs(off) > vatTolerance(x, fits.length)) return fits.map((v) => ({ ...v, vatKurus: null }));
  // The document's KDV wins over the kuruş of a per-rate sum: an e-Arşiv rounds KDV item by item.
  const largest = vats.indexOf(Math.max(...vats));
  return fits.map((v, i) => ({ ...v, vatKurus: vats[i] + (i === largest ? off : 0) }));
}

export function toReceiptData(x: ReceiptExtraction): ReceiptData {
  return {
    vendorName: x.vendorName,
    receiptNo: x.receiptNo,
    date: x.date === null ? null : parseReceiptDate(x.date),
    vatLines: vatLinesOf(x),
    totalKurus: amountOrNull(x.total),
    paymentMethod: x.paymentMethod,
    payments: paymentsOf(x),
    category: x.category,
  };
}

/** A receipt paid more than one way, by method, when the parts read and add up to the total; otherwise none (one credit line). */
function paymentsOf(x: ReceiptExtraction): { method: "cash" | "card" | "other"; kurus: number }[] | undefined {
  const parts = (x.payments ?? []).map((p) => ({ method: p.method, kurus: amountOrNull(p.amount) }));
  const total = amountOrNull(x.total);
  if (parts.length < 2 || total === null || parts.some((p) => p.kurus === null || p.kurus <= 0)) return undefined;
  const merged = new Map<"cash" | "card" | "other", number>();
  for (const p of parts) merged.set(p.method, (merged.get(p.method) ?? 0) + p.kurus!);
  if ([...merged.values()].reduce((s, n) => s + n, 0) !== total || merged.size < 2) return undefined;
  return [...merged].map(([method, kurus]) => ({ method, kurus }));
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
  const sum = data.vatLines.reduce((s, v) => s + v.grossKurus, 0);
  // A breakdown line that could not be read, unless the item lines made up a breakdown that adds up anyway.
  if (data.totalKurus === null || (x.vatLines.some((v) => amountOrNull(v.gross) === null) && sum !== data.totalKurus)) problems.push("amount_unreadable");
  // A foreign invoice usually shows no KDV at all; its total stands alone.
  else if (kind !== "foreign_invoice" && sum !== data.totalKurus) problems.push("total_mismatch");
  if (kind === "foreign_invoice" && !/^[A-Z]{3}$/.test(x.currency ?? "")) problems.push("currency_unsure");
  if (kind === "z_report" && data.totalKurus !== null) {
    const cash = amountOrNull(x.cashTotal), card = amountOrNull(x.cardTotal);
    if (cash === null && card === null) problems.push("z_payment_split");
    else if (cash !== null && card !== null && cash + card !== data.totalKurus) problems.push("z_payment_split");
  }
  if (data.vatLines.some((v) => v.vatKurus !== null && Math.abs(v.vatKurus - vatFromGross(v.grossKurus, v.rate)) > vatTolerance(x, 1))) problems.push("vat_mismatch");
  // TOPKDV against the KDV of the lines: a discount taken off the wrong rate shows here.
  const totalVat = amountOrNull(x.totalVat ?? null);
  const vatSum = data.vatLines.reduce((s, v) => s + (v.vatKurus ?? vatFromGross(v.grossKurus, v.rate)), 0);
  // A Z report also prints the cumulative KDV; only receipts and invoices are checked this way.
  if ((kind === "receipt" || kind === "domestic_invoice") && totalVat !== null && data.vatLines.length && Math.abs(vatSum - totalVat) > vatTolerance(x, data.vatLines.length) && !problems.includes("vat_mismatch")) problems.push("vat_mismatch");
  // A Turkish seller's invoice in euros or dollars would otherwise be booked as if the figures were lira.
  if ((kind === "receipt" || kind === "domestic_invoice") && x.currency && /^[A-Z]{3}$/.test(x.currency) && x.currency !== "TRY") problems.push("domestic_currency");
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
  // Several ways of paying that do not add up to the total: the credit side cannot be split, so it is checked by hand.
  if ((x.payments?.length ?? 0) > 1 && !data.payments) add("payment_unsure");
  if (unsure("receiptNo")) add("receipt_no_unsure");
  return problems;
}
