import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./default-rules";
import type { ReceiptExtraction } from "./extract/schema";
import { linesFor, ticketAccount } from "./rebuild";

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
