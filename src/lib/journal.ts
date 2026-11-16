import { descriptionFromVendor } from "./description";
import { CATEGORIES, LEGACY_VAT_RATES, type Account, type PaymentMethod, type Rules } from "./default-rules";
import { formatTrAmount, vatFromGross } from "./money";

export type VatLine = { rate: number; grossKurus: number; vatKurus: number | null };

/** Receipt fields after parsing, all money in kuruş. */
export type ReceiptData = {
  vendorName: string | null;
  receiptNo: string | null;
  date: string | null; // ISO yyyy-mm-dd
  vatLines: VatLine[];
  totalKurus: number | null;
  paymentMethod: PaymentMethod;
  /** Paid more than one way (cash and card, points, a gift card): one credit line per way. Adds up to the total. */
  payments?: { method: PaymentMethod; kurus: number }[];
  category: string;
};

export type JournalLine = {
  accountCode: string;
  accountName: string;
  debitKurus: number;
  creditKurus: number;
  description: string;
  documentNo: string;
  documentDate: string | null;
  documentType: string;
  quantity: number;
  babs: boolean;
};

export type Warning = { code: string; message: string };

export const WARNING_MESSAGES: Record<string, string> = {
  lodging_tax: "Konaklama vergisi KDV değildir, 191 hesabına yazılmaz.",
  legacy_rate: "Fişte güncel olmayan KDV oranı var (%8 veya %18). 191 hesabını seçin.",
  unknown_rate: "Kural tablosunda olmayan KDV oranı var. 191 hesabını seçin.",
  total_mismatch: "Oran bazlı toplamlar fiş toplamıyla tutmuyor. Tutarları kontrol edin.",
  rounding_adjusted: "Fiş toplamıyla aradaki kuruş farkı gider satırına eklendi.",
  vat_mismatch: "Fişteki KDV, oran ve tutarla uyuşmuyor. Oranı ve KDV tutarını kontrol edin.",
  vat_computed: "KDV fişten okunamadı, orandan hesaplandı.",
  vat_missing: "KDV kırılımı okunamadı. Toplam tek gider satırına yazıldı, KDV satırını elle ekleyin.",
  amount_unreadable: "Bazı tutarlar okunamadı. Fişle karşılaştırın.",
  tax_number_invalid: "VKN veya TCKN kontrol hanesi tutmuyor. Fişle karşılaştırın.",
  date_invalid: "Fiş tarihi okunamadı. Evrak Tarihini girin.",
  date_unusual: "Fiş tarihi ileri bir tarih ya da bir yıldan eski. Yıl yanlış okunmuş olabilir, Evrak Tarihini kontrol edin.",
  payment_unsure: "Ödeme şekli fişten okunamadı. Alacak hesabını kontrol edin.",
  receipt_no_unsure: "Fiş no okunamadı. Evrak No'yu kontrol edin.",
  duplicate: "Bu VKN, fiş no ve tarihle kayıtlı başka bir fiş var. Aynı fiş iki kez aktarılmasın.",
  extraction_failed: "Fiş okunamadı, tekrar deneyin veya elle girin.",
  currency_unsure: "Faturanın para birimi okunamadı; tutarlar boş bırakıldı. TL tutarlarını faturadan girin.",
  foreign_rate_missing: "Döviz kuru alınamadı. TL tutarlarını TCMB döviz alış kuruyla elle girin.",
  foreign_vat_charged: "Faturada KDV görünüyor; sorumlu sıfatıyla KDV hesaplanmadı. Satırları faturayla karşılaştırın.",
  foreign_withholding: "Yurt dışından alınan hizmette gelir veya kurumlar vergisi stopajı gerekebilir; muhtasarı kontrol edin.",
  z_payment_split: "Nakit ve kartlı tahsilat Z raporundan tam okunamadı ya da toplamı tutmuyor. Tahsilat satırlarını kontrol edin.",
  domestic_currency: "Belge TL dışında bir para biriminde. Tutarlar TL değildir; TL karşılıklarını belgeden girin.",
  no_fiscal_value: "Belgede “MALİ DEĞERİ YOKTUR” yazıyor: gider ve KDV belgesi değildir. Bu taslağı silin, asıl fişi ya da faturayı yükleyin.",
  vehicle_choice: "Araç binek mi ticari mi? Yevmiye satırlarının üstündeki Araç seçiminden seçin; seçilmeden onaylanmaz.",
  payment_other: "Ödemenin tamamı ya da bir kısmı puan, hediye çeki, yemek kartı ya da açık hesapla. O alacak satırının hesabını kontrol edin.",
  withholding: "Faturada KDV tevkifatı var. Tevkif edilen KDV satırları (191 ve 360) eklenmedi; satırları faturaya göre düzeltin.",
  plan_no_account: "Firmanın Luca planında bu satıra uyan hesap bulunamadı. Hesap kodunu plandan seçin.",
  z_unknown_rate: "Kural tablosunda olmayan KDV oranı var. Satış ve KDV hesabını seçin.",
};

export const warn = (code: string): Warning => ({ code, message: WARNING_MESSAGES[code] });

/** Warnings no longer given; receipts read before keep them in the database, so they are dropped where shown. Binek is now a choice on the review screen. */
export const RETIRED_WARNINGS: readonly string[] = ["vehicle", "meal"];

export function buildJournalLines(receipt: ReceiptData, rules: Rules): { lines: JournalLine[]; warnings: Warning[]; balanced: boolean } {
  const warnings: Warning[] = [];
  const base = {
    description: descriptionFromVendor(receipt.vendorName),
    documentNo: receipt.receiptNo ?? "",
    documentDate: receipt.date,
    documentType: rules.documentType,
    quantity: 0,
    babs: false,
  };
  const expense = rules.expense[receipt.category] ?? rules.expense.other;
  const line = (account: Account, debitKurus: number, creditKurus: number): JournalLine =>
    ({ accountCode: account.code, accountName: account.name, debitKurus, creditKurus, ...base });

  const lines: JournalLine[] = [];
  const expenseLines: JournalLine[] = [];
  let grossSum = 0;
  let vatComputed = false;

  for (const v of receipt.vatLines) {
    const expected = vatFromGross(v.grossKurus, v.rate);
    const vat = v.vatKurus ?? expected;
    // A %0 line has no KDV to read. A KDV that differs from its rate is told by the read's own check (checkExtraction), which
    // knows how many items it was rounded over; here the document's figure is simply booked.
    if (v.vatKurus === null && v.rate > 0) vatComputed = true;
    grossSum += v.grossKurus;

    const expenseLine = line(expense, v.grossKurus - vat, 0);
    expenseLines.push(expenseLine);
    lines.push(expenseLine);
    if (v.rate > 0 && vat > 0) {
      const vatAccount = rules.vat[v.rate];
      if (!vatAccount) warnings.push(warn(LEGACY_VAT_RATES.includes(v.rate) ? "legacy_rate" : "unknown_rate"));
      lines.push(line(vatAccount ?? { code: "", name: "" }, vat, 0));
    }
  }
  if (vatComputed) warnings.push(warn("vat_computed"));

  const total = receipt.totalKurus ?? grossSum;
  if (receipt.vatLines.length === 0) {
    if (total > 0) warnings.push(warn("vat_missing"));
    lines.push(line(expense, total, 0));
  } else if (total !== grossSum) {
    const diff = total - grossSum;
    if (Math.abs(diff) <= receipt.vatLines.length) {
      const largest = expenseLines.reduce((a, b) => (b.debitKurus > a.debitKurus ? b : a));
      largest.debitKurus += diff;
      warnings.push(warn("rounding_adjusted"));
    } else {
      warnings.push(warn("total_mismatch"));
    }
  }

  const credit = rules.payment[receipt.paymentMethod];
  const split = receipt.payments && receipt.payments.reduce((s, p) => s + p.kurus, 0) === total ? receipt.payments : null;
  if (split) for (const p of split) lines.push(line(rules.payment[p.method], 0, p.kurus));
  else lines.push(line(credit, 0, total));
  // Points, a gift card, a meal card or an open account paid part of it: not the partner's money, the user says what it is.
  if (split ? split.some((p) => p.method === "other") : receipt.paymentMethod === "other") warnings.push(warn("payment_other"));

  const categoryWarning = CATEGORIES.find((c) => c.key === receipt.category)?.warning;
  if (categoryWarning) warnings.push(warn(categoryWarning));

  const unique = warnings.filter((w, i) => warnings.findIndex((x) => x.code === w.code) === i);
  return { lines, warnings: unique, balanced: isBalanced(lines) };
}

/** Debit total equals credit total, both non-zero, every line has an account and exactly one side. */
export function isBalanced(lines: readonly Pick<JournalLine, "accountCode" | "debitKurus" | "creditKurus">[]): boolean {
  let debit = 0;
  let credit = 0;
  for (const l of lines) {
    if (!l.accountCode || l.debitKurus < 0 || l.creditKurus < 0 || (l.debitKurus > 0) === (l.creditKurus > 0)) return false;
    debit += l.debitKurus;
    credit += l.creditKurus;
  }
  return debit > 0 && debit === credit;
}

type ApprovalLine = Pick<JournalLine, "accountCode" | "debitKurus" | "creditKurus" | "documentNo" | "documentDate">;

/** First reason the lines cannot be approved or exported, in Turkish; null when they can. With the firm's Luca plan, every code must be in it. */
export function approvalProblem(lines: readonly ApprovalLine[], plan?: ReadonlySet<string>, postable?: ReadonlySet<string>): string | null {
  if (lines.length === 0) return "Satır yok.";
  for (const [i, l] of lines.entries()) {
    if (!l.accountCode) return `${i + 1}. satırda hesap kodu yok.`;
    if (plan?.size && !plan.has(l.accountCode)) return `${i + 1}. satırdaki ${l.accountCode} hesabı firmanın Luca planında yok.`;
    if (postable?.size && !postable.has(l.accountCode)) return `${i + 1}. satırdaki ${l.accountCode} hesabının alt hesapları var; alt hesaplardan birini seçin.`;
    if (l.debitKurus < 0 || l.creditKurus < 0) return `${i + 1}. satırda eksi tutar var.`;
    if (l.debitKurus > 0 && l.creditKurus > 0) return `${i + 1}. satırda hem borç hem alacak var.`;
    if (l.debitKurus === 0 && l.creditKurus === 0) return `${i + 1}. satırda tutar yok.`;
  }
  const diff = lines.reduce((s, l) => s + l.debitKurus - l.creditKurus, 0);
  if (diff !== 0) return `Borç ile alacak farkı ${formatTrAmount(Math.abs(diff))} TL.`;
  if (lines.some((l) => !l.documentDate || !/^\d{4}-\d{2}-\d{2}$/.test(l.documentDate))) return "Evrak tarihi eksik.";
  if (new Set(lines.map((l) => l.documentDate)).size > 1) return "Satırlarda evrak tarihi farklı.";
  if (lines.some((l) => !l.documentNo.trim())) return "Evrak no eksik.";
  return null;
}
