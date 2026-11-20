import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import type { ReceiptExtraction } from "./extract/schema";
import { linesFor, ticketAccount } from "./rebuild";
import { learnedAccount } from "./vendor-rule";

const ticket = {
  documentKind: "domestic_invoice", vendorName: "Güneş Ekspres Havacılık A.Ş.", taxOffice: null, taxNumber: "4340050485", date: "08.10.2026", time: null,
  receiptNo: "5640176488590", zNo: null, ekuNo: null, vatLines: [{ rate: 0, gross: "1.655,10", vat: "0,00", net: null }], lineItems: [], discounts: [],
  totalVat: "0,00", total: "1.655,10", currency: "TRY", cashTotal: null, cardTotal: null, invoicedTotal: null, paymentMethod: "card", payments: [],
  category: "transport", withholding: false, noFiscalValue: false, unreadableFields: [],
} as unknown as ReceiptExtraction;
const plan = [{ code: "320", name: "Satıcılar" }, { code: "320.B00", name: "Bilet Cari" }, { code: "331.01", name: "Ortaklara Borçlar" }];

describe("bilet cari hesabı", () => {
  it("bilet, firmanın Luca planındaki Bilet Cari hesabına alacak yazılır", () => {
    const { lines } = linesFor(ticket, DEFAULT_RULES, null, plan);
    expect(lines.filter((l) => l.creditKurus > 0).map((l) => l.accountCode)).toEqual(["320.B00"]);
  });
  it("planda Bilet Cari yoksa ya da belge bilet değilse ödeme kuralı kalır", () => {
    expect(linesFor(ticket, DEFAULT_RULES, null, []).lines.find((l) => l.creditKurus > 0)?.accountCode).toBe("331.01");
    expect(linesFor({ ...ticket, category: "meal" } as ReceiptExtraction, DEFAULT_RULES, null, plan).lines.find((l) => l.creditKurus > 0)?.accountCode).toBe("331.01");
  });
  it("büyük harfli ad da bulunur, iki aday varsa seçilmez", () => {
    expect(ticketAccount([{ code: "320.B00", name: "BİLET CARİ" }])?.code).toBe("320.B00");
    expect(ticketAccount([{ code: "320.B00", name: "Bilet Cari" }, { code: "336.B01", name: "Bilet Cari 2" }])).toBeUndefined();
  });
});

describe("iade bileti", () => {
  const plan = [
    { code: "320.B00", name: "Bilet Cari" }, { code: "770.17", name: "Bilet Giderleri" },
    { code: "770.18", name: "Bilet İade Kdv Siz" }, { code: "770.19", name: "Bilet İade Kdv Li" },
    { code: "191.01", name: "Satışlardan İade Kdv" }, { code: "191.03.20", name: "% 20 Li İndirilecek Kdv" },
  ];
  const learned = { code: "770.17", name: "Bilet Giderleri" };
  const codes = (r: ReturnType<typeof linesFor>) => r.lines.map((l) => [l.accountCode, l.debitKurus, l.creditKurus]);

  it("KDV'siz iade 770.18'e, alacak Bilet Cari'ye", () => {
    const r = linesFor({ ...ticket, ekuNo: "IADE", vatLines: [{ rate: 0, gross: "1.421,32", vat: "0,00", net: null }], total: "1.421,32" }, DEFAULT_RULES, learned, plan);
    expect(codes(r)).toEqual([["770.18", 142132, 0], ["320.B00", 0, 142132]]);
  });

  it("KDV'li iade 770.19 ve 191.01'e, öğrenilen hesap kullanılmaz", () => {
    const r = linesFor({ ...ticket, ekuNo: "İADE", vatLines: [{ rate: 20, gross: "6.748,24", vat: "1.124,80", net: null }], total: "6.748,24", totalVat: "1.124,80" }, DEFAULT_RULES, learned, plan);
    expect(codes(r)).toEqual([["770.19", 562344, 0], ["191.01", 112480, 0], ["320.B00", 0, 674824]]);
  });

  it("iade değilse ya da planda iade hesabı yoksa eski kayıt kalır", () => {
    const vatLines = [{ rate: 0, gross: "1.421,32", vat: "0,00", net: null }];
    expect(codes(linesFor({ ...ticket, vatLines, total: "1.421,32" }, DEFAULT_RULES, learned, plan))[0][0]).toBe("770.17");
    expect(codes(linesFor({ ...ticket, ekuNo: "IADE", vatLines, total: "1.421,32" }, DEFAULT_RULES, learned, plan.slice(0, 2)))[0][0]).toBe("770.17");
  });

  it("iade hesabıyla onay satıcıya öğretilmez", () => {
    expect(learnedAccount([{ accountCode: "770.19", accountName: "Bilet İade Kdv Li", debitKurus: 100 }], DEFAULT_RULES.expense.transport)).toBeUndefined();
  });
});
