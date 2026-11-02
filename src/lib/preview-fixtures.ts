// Sample data for the dev-only screen preview (/onizleme) and nothing else. Mirrors the real example receipt.
import type { ReceiptDetail } from "@/db/queries";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";
import { buildJournalLines, warn, type ReceiptData } from "./journal";

const base = (id: string, data: ReceiptData, extra: Partial<ReceiptDetail> = {}): ReceiptDetail => {
  const { lines, warnings } = buildJournalLines(data, DEFAULT_RULES);
  return {
    id, status: "draft", vendorName: data.vendorName, receiptNo: data.receiptNo, receiptDate: data.date, totalKurus: data.totalKurus,
    createdAt: new Date("2026-09-05T17:30:00Z"), taxNumber: "1111111114", paymentMethod: data.paymentMethod, category: data.category,
    warnings, lines, ...extra,
  };
};

export const PREVIEW_RECEIPTS: ReceiptDetail[] = [
  base("00000000-0000-4000-8000-000000000001", {
    vendorName: "ÖRNEK ALABALIK ÜRETİM ÇİFTLİĞİ VE RES.İŞL.LTD.ŞTİ", receiptNo: "0047", date: "2026-09-05",
    vatLines: [{ rate: 10, grossKurus: 872500, vatKurus: 79318 }], totalKurus: 872500, paymentMethod: "card", category: "meal",
  }),
  base("00000000-0000-4000-8000-000000000002", {
    vendorName: "OPET PETROLCÜLÜK A.Ş.", receiptNo: "1182", date: null,
    vatLines: [{ rate: 20, grossKurus: 250000, vatKurus: null }], totalKurus: 250000, paymentMethod: "cash", category: "fuel",
  }, { warnings: [warn("vehicle"), warn("date_invalid"), warn("vat_computed"), warn("tax_number_invalid")], taxNumber: "1234567890" }),
  { ...base("00000000-0000-4000-8000-000000000003", {
    vendorName: "KIRTASİYE DÜNYASI", receiptNo: "0912", date: "2026-09-02",
    vatLines: [{ rate: 20, grossKurus: 48000, vatKurus: 8000 }], totalKurus: 48000, paymentMethod: "cash", category: "stationery",
  }), status: "approved" },
  { ...base("00000000-0000-4000-8000-000000000004", {
    vendorName: "PTT KARGO", receiptNo: "5531", date: "2026-08-28",
    vatLines: [{ rate: 20, grossKurus: 13500, vatKurus: 2250 }], totalKurus: 13500, paymentMethod: "card", category: "cargo",
  }), status: "exported" },
];

export const PREVIEW_RULE_ROWS = rulesToRows(DEFAULT_RULES);
