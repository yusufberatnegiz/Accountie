// Sample receipts for the homepage counter (docs/design/YON.md 3.3). Amounts of A and B mirror preview-fixtures; every vendor name and item is invented.
// No tax number, no card digits, no photo: only what a thermal print shows and the journal needs.
import { DEFAULT_RULES, PAYMENT_ALTERNATIVES, type PaymentMethod } from "@/lib/default-rules";
import { buildJournalLines, type ReceiptData } from "@/lib/journal";

/** A printed item line: what the strip shows above TOPKDV. Items of one rate add up to that rate's gross. */
export type Item = { name: string; rate: number; kurus: number };
export type Sample = { id: string; label: string; receipt: ReceiptData; items: readonly Item[] };

export const SAMPLES: readonly Sample[] = [
  {
    id: "alabalik", label: "Lokanta",
    receipt: {
      vendorName: "ÖRNEK BALIK LOKANTASI", receiptNo: "0047", date: "2026-09-05",
      vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
    },
    items: [
      { name: "LEVREK 2 AD", rate: 10, kurus: 310000 },
      { name: "KARİDES GÜVEÇ", rate: 10, kurus: 185000 },
      { name: "MEZE TABAĞI 4", rate: 10, kurus: 220000 },
      { name: "SALATA 2 AD", rate: 10, kurus: 57500 },
      { name: "İÇECEK 4 AD", rate: 10, kurus: 100000 },
    ],
  },
  {
    id: "kirtasiye", label: "Kırtasiye",
    receipt: {
      vendorName: "ÖRNEK KIRTASİYE", receiptNo: "0912", date: "2026-09-02",
      vatLines: [{ rate: 20, grossKurus: 48000, vatKurus: 8000 }], totalKurus: 48000, paymentMethod: "cash", category: "stationery",
    },
    items: [
      { name: "A4 KAĞIT 2 PK", rate: 20, kurus: 36000 },
      { name: "DOSYA 10 AD", rate: 20, kurus: 12000 },
    ],
  },
  {
    id: "market", label: "Market",
    receipt: {
      vendorName: "ÖRNEK MARKET", receiptNo: "2214", date: "2026-09-04",
      vatLines: [{ rate: 1, grossKurus: 41250, vatKurus: 408 }, { rate: 20, grossKurus: 18600, vatKurus: 3100 }],
      totalKurus: 59850, paymentMethod: "card", category: "food_grocery",
    },
    items: [
      { name: "EKMEK 3 AD", rate: 1, kurus: 4500 },
      { name: "SÜT 2 LT", rate: 1, kurus: 9250 },
      { name: "YUMURTA 30 AD", rate: 1, kurus: 27500 },
      { name: "DETERJAN", rate: 20, kurus: 18600 },
    ],
  },
];

/**
 * Receipts the page shows outside the counter, so each slot reads its own fiş (YON 23.15): a fuel receipt for the signature scene,
 * a café receipt for "Bir fişin yolu" and the auth screens. Same rules as SAMPLES: invented ÖRNEK vendors, items add up to the gross.
 */
export const AKARYAKIT: Sample = {
  id: "akaryakit", label: "Akaryakıt",
  receipt: {
    vendorName: "ÖRNEK AKARYAKIT", receiptNo: "1185", date: "2026-09-03",
    vatLines: [{ rate: 20, grossKurus: 215000, vatKurus: 35833 }], totalKurus: 215000, paymentMethod: "card", category: "fuel",
  },
  items: [{ name: "MOTORİN 41,35 LT", rate: 20, kurus: 215000 }],
};
export const KAFE: Sample = {
  id: "kafe", label: "Kafe",
  receipt: {
    vendorName: "ÖRNEK KAFE", receiptNo: "0331", date: "2026-09-01",
    vatLines: [{ rate: 10, grossKurus: 26500, vatKurus: 2409 }], totalKurus: 26500, paymentMethod: "card", category: "meal",
  },
  items: [
    { name: "FİLTRE KAHVE 2", rate: 10, kurus: 13000 },
    { name: "SU BÖREĞİ", rate: 10, kurus: 9500 },
    { name: "SU 2 AD", rate: 10, kurus: 4000 },
  ],
};

/**
 * How the receipt was paid, as a muhasebeci asks it: a card is the partner's (331.01, the default rule) or the company's (309.01).
 * Both print as KREDİ KARTI on the receipt.
 */
export type Payment = { id: "partner" | "company" | "cash"; label: string; method: PaymentMethod };
export const PAYMENTS: readonly Payment[] = [
  { id: "partner", label: "Ortağın kartı", method: "card" },
  { id: "company", label: "Şirket kartı", method: "card" },
  { id: "cash", label: "Nakit", method: "cash" },
];
const COMPANY_CARD = PAYMENT_ALTERNATIVES.find((a) => a.code === "309.01")!;

/** The counter's whole computation: the product's own journal function with the default chart of accounts. */
export function journalFor(sample: Sample, payment: Payment["id"]) {
  const p = PAYMENTS.find((x) => x.id === payment) ?? PAYMENTS[0];
  const rules = p.id === "company" ? { ...DEFAULT_RULES, payment: { ...DEFAULT_RULES.payment, card: { code: COMPANY_CARD.code, name: COMPANY_CARD.name } } } : DEFAULT_RULES;
  return buildJournalLines({ ...sample.receipt, paymentMethod: p.method }, rules);
}

export const defaultPayment = (s: Sample): Payment["id"] => (s.receipt.paymentMethod === "cash" ? "cash" : "partner");

/**
 * Where each journal line comes from on the strip (the panel's "fiş izi"): an expense line from its rate's items,
 * a VAT line from its KDV row, the credit line from TOPLAM and the payment row. Same order as buildJournalLines.
 */
export type Source = { kind: "items" | "vat"; rate: number } | { kind: "total" };
export function sourcesFor(sample: Sample): Source[] {
  const out: Source[] = [];
  for (const v of sample.receipt.vatLines) {
    out.push({ kind: "items", rate: v.rate });
    if (v.rate > 0 && (v.vatKurus ?? 0) > 0) out.push({ kind: "vat", rate: v.rate });
  }
  out.push({ kind: "total" });
  return out;
}

/**
 * Older rule tables may still hold Luca's own spelling ("% 10 Lı İndirilecek Kdv"); the public page shows them in written Turkish, as the defaults now are.
 */
export const shownAccountName = (name: string) =>
  name.replace(/^% ?(\d+) L[ıiu] İndirilecek Kdv$/, "%$1 İndirilecek KDV").replace(/ Ve /g, " ve ");
