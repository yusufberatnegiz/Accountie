// Sample data for the dev-only screen preview (/onizleme) and nothing else. Invented ÖRNEK vendor and tax number.
import type { Firm, ReceiptDetail } from "@/db/queries";
import { DEFAULT_RULES, rulesToRows } from "./default-rules";
import { buildJournalLines, warn, type ReceiptData } from "./journal";
// A müşavir's mükellefs: invented ÖRNEK names, enough of them to show the search. The first holds the preview receipts.
const FIRM_NAMES = ["BALIK LOKANTASI LTD.ŞTİ","İNŞAAT A.Ş.","KUAFÖR","MOBİLYA SAN.TİC.LTD.ŞTİ","ECZANE","OTO SERVİS","KIRTASİYE","DİŞ KLİNİĞİ","LOJİSTİK A.Ş.","FIRIN","YAZILIM LTD.ŞTİ","TEKSTİL","KAFE","NAKLİYAT","OPTİK","ÇİÇEKÇİLİK","MATBAA","ELEKTRİK MALZEMELERİ","HIRDAVAT","SPOR SALONU","VETERİNER KLİNİĞİ","TURİZM SEYAHAT","GIDA PAZARLAMA","OTO KİRALAMA","MİMARLIK OFİSİ","REKLAM AJANSI","KUYUMCU","BUTİK OTEL","PASTANE","BİLGİSAYAR TEKNİK","TEMİZLİK HİZMETLERİ","KASAP","EMLAK","DANIŞMANLIK LTD.ŞTİ","KREŞ","ZİRAAT ÜRÜNLERİ"];
export const PREVIEW_FIRMS: Firm[] = FIRM_NAMES.map((name, i) => ({
  id: `00000000-0000-4000-9000-${String(i + 1).padStart(12, "0")}`, name: `ÖRNEK ${name}`, taxNumber: i === 0 ? "1111111114" : null,
})).sort((a, b) => a.name.localeCompare(b.name, "tr"));
export const PREVIEW_FIRM = PREVIEW_FIRMS.find((f) => f.id.endsWith("000000000001"))!;

const base = (id: string, data: ReceiptData, extra: Partial<ReceiptDetail> = {}): ReceiptDetail => {
  const { lines, warnings } = buildJournalLines(data, DEFAULT_RULES);
  return {
    id, firmId: PREVIEW_FIRM.id, status: "draft", vendorName: data.vendorName, receiptNo: data.receiptNo, receiptDate: data.date, totalKurus: data.totalKurus,
    createdAt: new Date("2026-09-05T17:30:00Z"), taxNumber: "1111111114", paymentMethod: data.paymentMethod, category: data.category,
    warnings, lines, ...extra,
  };
};

export const PREVIEW_RECEIPTS: ReceiptDetail[] = [
  base("00000000-0000-4000-8000-000000000001", {
    vendorName: "ÖRNEK BALIK LOKANTASI", receiptNo: "0412", date: "2026-09-08",
    vatLines: [{ rate: 10, grossKurus: 648000, vatKurus: 58909 }], totalKurus: 648000, paymentMethod: "card", category: "meal",
  }),
  base("00000000-0000-4000-8000-000000000002", {
    vendorName: "ÖRNEK AKARYAKIT A.Ş.", receiptNo: "1182", date: null,
    vatLines: [{ rate: 20, grossKurus: 250000, vatKurus: null }], totalKurus: 250000, paymentMethod: "cash", category: "fuel",
  }, { warnings: [warn("vehicle"), warn("date_invalid"), warn("vat_computed"), warn("tax_number_invalid")], taxNumber: "1234567890" }),
  { ...base("00000000-0000-4000-8000-000000000003", {
    vendorName: "ÖRNEK KIRTASİYE", receiptNo: "0912", date: "2026-09-02",
    vatLines: [{ rate: 20, grossKurus: 48000, vatKurus: 8000 }], totalKurus: 48000, paymentMethod: "cash", category: "stationery",
  }), status: "approved" },
  { ...base("00000000-0000-4000-8000-000000000004", {
    vendorName: "ÖRNEK KARGO", receiptNo: "5531", date: "2026-08-28",
    vatLines: [{ rate: 20, grossKurus: 13500, vatKurus: 2250 }], totalKurus: 13500, paymentMethod: "card", category: "cargo",
  }), status: "exported" },
  // A month of a small office at its real size, so the list is seen at working density.
  base("00000000-0000-4000-8000-000000000005", {
    vendorName: "ÖRNEK PANSİYON TURİZM LTD.ŞTİ", receiptNo: "0311", date: "2026-09-04",
    vatLines: [{ rate: 10, grossKurus: 360000, vatKurus: 32727 }], totalKurus: 360000, paymentMethod: "card", category: "lodging",
  }),
  { ...base("00000000-0000-4000-8000-000000000006", {
    vendorName: "ÖRNEK OTOPARK İŞLETMECİLİĞİ", receiptNo: "2208", date: "2026-09-03",
    vatLines: [{ rate: 20, grossKurus: 15000, vatKurus: 2500 }], totalKurus: 15000, paymentMethod: "cash", category: "parking",
  }), status: "approved" },
  { ...base("00000000-0000-4000-8000-000000000007", {
    vendorName: "ÖRNEK TEMİZLİK MALZEMELERİ", receiptNo: "0764", date: "2026-09-01",
    vatLines: [{ rate: 20, grossKurus: 64800, vatKurus: 10800 }], totalKurus: 64800, paymentMethod: "card", category: "cleaning",
  }), status: "approved" },
  { ...base("00000000-0000-4000-8000-000000000008", {
    vendorName: "ÖRNEK GIDA", receiptNo: "4419", date: "2026-08-30",
    vatLines: [{ rate: 1, grossKurus: 21740, vatKurus: 215 }], totalKurus: 21740, paymentMethod: "cash", category: "food_grocery",
  }), status: "approved" },
  { ...base("00000000-0000-4000-8000-000000000009", {
    vendorName: "ÖRNEK TAKSİ DURAĞI", receiptNo: "0093", date: "2026-08-29",
    vatLines: [{ rate: 20, grossKurus: 42000, vatKurus: 7000 }], totalKurus: 42000, paymentMethod: "cash", category: "transport",
  }), status: "exported" },
  { ...base("00000000-0000-4000-8000-000000000010", {
    vendorName: "ÖRNEK İLETİŞİM BAYİ", receiptNo: "1276", date: "2026-08-27",
    vatLines: [{ rate: 20, grossKurus: 89900, vatKurus: 14983 }], totalKurus: 89900, paymentMethod: "card", category: "telecom",
  }), status: "exported" },
];

export const PREVIEW_RULE_ROWS = rulesToRows(DEFAULT_RULES);
export const PREVIEW_EMAIL = "muhasebe@buro.example";

/** The list screen's row shape, computed from the fixtures the way listReceipts computes it in SQL. */
export const PREVIEW_LIST = PREVIEW_RECEIPTS.map(({ lines, taxNumber, paymentMethod, category, ...r }) => ({
  ...r,
  expenseCode: lines.find((l) => l.debitKurus > 0 && !l.accountCode.startsWith("191"))?.accountCode ?? null,
  lineCount: lines.length,
  expenseKurus: lines.reduce((n, l) => n + (l.accountCode.startsWith("191") ? 0 : l.debitKurus), 0),
  vatKurus: lines.reduce((n, l) => n + (l.accountCode.startsWith("191") ? l.debitKurus : 0), 0),
}));

