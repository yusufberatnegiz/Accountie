// Sample receipts for the homepage counter (docs/design/YON.md 3.3). Amounts of A and B mirror preview-fixtures; every vendor name is invented.
// No tax number, no card digits, no photo: only what a thermal print shows and the journal needs.
import { DEFAULT_RULES, type PaymentMethod } from "@/lib/default-rules";
import { buildJournalLines, type ReceiptData } from "@/lib/journal";

export type Sample = { id: string; label: string; receipt: ReceiptData };

export const SAMPLES: readonly Sample[] = [
  {
    id: "alabalik", label: "Lokanta, %10",
    receipt: {
      vendorName: "ÖRNEK BALIK LOKANTASI", receiptNo: "0047", date: "2026-09-05",
      vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
    },
  },
  {
    id: "kirtasiye", label: "Kırtasiye, %20",
    receipt: {
      vendorName: "KIRTASİYE DÜNYASI", receiptNo: "0912", date: "2026-09-02",
      vatLines: [{ rate: 20, grossKurus: 48000, vatKurus: 8000 }], totalKurus: 48000, paymentMethod: "cash", category: "stationery",
    },
  },
  {
    id: "market", label: "Market, iki oran",
    receipt: {
      vendorName: "GÜNEŞ MARKET", receiptNo: "2214", date: "2026-09-04",
      vatLines: [{ rate: 1, grossKurus: 41250, vatKurus: 408 }, { rate: 20, grossKurus: 18600, vatKurus: 3100 }],
      totalKurus: 59850, paymentMethod: "card", category: "food_grocery",
    },
  },
];

/** The counter's whole computation: the product's own journal function with the default chart of accounts. */
export function journalFor(sample: Sample, payment: PaymentMethod) {
  return buildJournalLines({ ...sample.receipt, paymentMethod: payment }, DEFAULT_RULES);
}

/**
 * The default chart keeps Luca's own account names ("% 10 Lı İndirilecek Kdv"); the public page shows them in written Turkish.
 */
export const shownAccountName = (name: string) =>
  name.replace(/^% ?(\d+) L[ıiu] İndirilecek Kdv$/, "%$1 İndirilecek KDV").replace(/ Ve /g, " ve ");
