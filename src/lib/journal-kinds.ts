import { descriptionFromVendor } from "./description";
import { FOREIGN_VAT_RATE, type Account, type PaymentMethod, type Rules } from "./default-rules";
import { formatTrAmount, vatFromGross } from "./money";
import { isBalanced, warn, type JournalLine, type VatLine, type Warning } from "./journal";

/** A foreign service invoice (Google, Meta, AWS...) as read. Amounts in the invoice currency's hundredths. */
export type ForeignData = {
  vendorName: string | null;
  invoiceNo: string | null;
  date: string | null; // ISO yyyy-mm-dd
  currency: string; // "TRY", "USD"...; "" when it could not be read
  totalMinor: number | null;
  vatMinor: number; // KDV printed on the invoice, 0 when none
  paymentMethod: PaymentMethod;
};

/** The TCMB rate used for a foreign-currency invoice: TL per one unit, and the bulletin it came from. */
export type FxRate = { rate: number; bulletinDate: string };

/** A Z report as read. All money in kuruş. */
export type SalesData = {
  vendorName: string | null;
  zNo: string | null;
  date: string | null;
  vatLines: VatLine[]; // per rate: KDV-inclusive sales and the KDV in them
  totalKurus: number | null;
  cashKurus: number | null;
  cardKurus: number | null;
  invoicedKurus: number | null;
};

type Built = { lines: JournalLine[]; warnings: Warning[]; balanced: boolean };

const trDate = (iso: string) => iso.split("-").reverse().join(".");

/** The invoice in TL: as printed when it is in TL, else at the given rate (to the kuruş); null when no rate is known. */
export function foreignTotalTl(data: Pick<ForeignData, "currency" | "totalMinor">, fx: FxRate | null): number | null {
  if (data.totalMinor === null) return null;
  if (data.currency === "TRY") return data.totalMinor;
  return fx ? Math.round(data.totalMinor * fx.rate) : null;
}

/**
 * Expense in TL, and the KDV the buyer computes as the one responsible (sorumlu sıfatıyla, KDVK 9): 191 on the debit, 360 on
 * the credit, so the entry still balances on the amount paid. An invoice that already carries KDV gets no reverse charge.
 */
export function buildForeignLines(data: ForeignData, rules: Rules, fx: FxRate | null): Built {
  const warnings: Warning[] = [];
  const f = rules.foreign;
  // A foreign name is upper-cased the English way: "Google Ireland" must not become "GOOGLE İRELAND".
  const description = (data.vendorName ?? "").replace(/\s+/g, " ").trim().toLocaleUpperCase("en-US").slice(0, 120).trim();
  const base = { description, documentNo: data.invoiceNo ?? "", documentDate: data.date, documentType: f.documentType, quantity: 0, babs: false };
  const line = (a: Account, debitKurus: number, creditKurus: number): JournalLine => ({ accountCode: a.code, accountName: a.name, debitKurus, creditKurus, ...base });
  const total = foreignTotalTl(data, fx) ?? 0;

  if (!data.currency) warnings.push(warn("currency_unsure"));
  else if (data.currency !== "TRY") {
    if (fx) warnings.push({ code: "foreign_rate", message: `Tutar ${data.currency}; TCMB döviz alış kuru ${fx.rate.toLocaleString("tr-TR", { maximumFractionDigits: 4 })} (${trDate(fx.bulletinDate)} tarihli bülten) ile TL'ye çevrildi. Kuru kontrol edin.` });
    else warnings.push(warn("foreign_rate_missing"));
  }
  const lines = [line(f.expense, total, 0)];
  if (data.vatMinor > 0) warnings.push(warn("foreign_vat_charged"));
  else {
    const vat = Math.round((total * FOREIGN_VAT_RATE) / 100);
    if (vat > 0) lines.push(line(f.vatIn, vat, 0), line(f.vatOut, 0, vat));
  }
  lines.push(line(rules.payment[data.paymentMethod], 0, total));
  warnings.push(warn("foreign_withholding"));
  return { lines, warnings, balanced: isBalanced(lines) };
}

/**
 * The day's sales from a Z report: cash and card on the debit; per KDV rate, the sales (600) and the KDV on them (391) on the
 * credit. Sales already invoiced (e-Arşiv, e-Fatura) are only flagged: they reach Luca on their own and must not count twice.
 */
export function buildSalesLines(data: SalesData, rules: Rules): Built {
  const warnings: Warning[] = [];
  const s = rules.sales;
  const description = descriptionFromVendor(`Z RAPORU ${data.zNo ?? ""}`.trim());
  const base = { description, documentNo: data.zNo ?? "", documentDate: data.date, documentType: s.documentType, quantity: 0, babs: false };
  const line = (a: Account, debitKurus: number, creditKurus: number): JournalLine => ({ accountCode: a.code, accountName: a.name, debitKurus, creditKurus, ...base });

  const credits: JournalLine[] = [];
  const revenues: JournalLine[] = [];
  let grossSum = 0;
  for (const v of data.vatLines) {
    const expected = vatFromGross(v.grossKurus, v.rate);
    const vat = v.vatKurus ?? expected;
    if (v.vatKurus !== null && Math.abs(v.vatKurus - expected) > 1) warnings.push(warn("vat_mismatch"));
    grossSum += v.grossKurus;
    const revenue = line(s.revenue[v.rate] ?? { code: "", name: "" }, 0, v.grossKurus - vat);
    if (!s.revenue[v.rate]) warnings.push(warn("z_unknown_rate"));
    revenues.push(revenue);
    credits.push(revenue);
    if (v.rate > 0 && vat > 0) {
      if (!s.vat[v.rate]) warnings.push(warn("z_unknown_rate"));
      credits.push(line(s.vat[v.rate] ?? { code: "", name: "" }, 0, vat));
    }
  }
  const total = data.totalKurus ?? grossSum;
  if (data.vatLines.length === 0) {
    if (total > 0) warnings.push(warn("vat_missing"));
    credits.push(line(s.revenue[0] ?? { code: "", name: "" }, 0, total));
  } else if (total !== grossSum) {
    const diff = total - grossSum;
    if (Math.abs(diff) <= data.vatLines.length) {
      revenues.reduce((a, b) => (b.creditKurus > a.creditKurus ? b : a)).creditKurus += diff;
      warnings.push(warn("rounding_adjusted"));
    } else warnings.push(warn("total_mismatch"));
  }

  // Card as read; cash is the rest of the total, so the two always add up to it. A split that was not printed as such is flagged.
  const card = data.cardKurus !== null && data.cardKurus <= total ? data.cardKurus : 0;
  const cash = total - card;
  const read = data.cashKurus !== null || data.cardKurus !== null;
  if (!read || (data.cardKurus ?? 0) > total || (data.cashKurus ?? total - card) + card !== total) warnings.push(warn("z_payment_split"));
  const debits = [cash > 0 ? line(s.cash, cash, 0) : null, card > 0 ? line(s.card, card, 0) : null].filter((l): l is JournalLine => l !== null);
  if (data.invoicedKurus) warnings.push({ code: "z_invoiced", message: `Z raporunda ${formatTrAmount(data.invoicedKurus)} TL faturalı satış var. Bu faturalar e-Arşiv ya da e-Fatura olarak Luca'ya ayrıca geliyorsa bu tutarı satış satırlarından düşün; yoksa hasılat iki kez yazılır.` });

  const lines = [...debits, ...credits];
  const unique = warnings.filter((w, i) => warnings.findIndex((x) => x.code === w.code) === i);
  return { lines, warnings: unique, balanced: isBalanced(lines) };
}
