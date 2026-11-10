import { describe, expect, it } from "vitest";
import { decimalKurus, InvoiceError, invoiceData, invoiceRules, parseInvoice, skipReason } from "./efatura";
import { buildJournalLines } from "./journal";
import { DEFAULT_RULES } from "./default-rules";

const FIRM = "1111111114";
// A trimmed UBL-TR invoice: the fields Accountie reads plus lines and a signature-like block it must ignore.
export const invoiceXml = ({ type = "SATIS", currency = "TRY", supplier = "2222222224", customer = FIRM, extra = "", person = false } = {}) => `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2" xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2" xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  <cbc:ProfileID>TEMELFATURA</cbc:ProfileID>
  <cbc:ID>ABC2026000000412</cbc:ID>
  <cbc:IssueDate>2026-09-08</cbc:IssueDate>
  <cbc:InvoiceTypeCode>${type}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${currency}</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="MERSISNO">0123456789000001</cbc:ID></cac:PartyIdentification>
    <cac:PartyIdentification><cbc:ID schemeID="${person ? "TCKN" : "VKN"}">${supplier}</cbc:ID></cac:PartyIdentification>
    ${person ? "<cac:Person><cbc:FirstName>Ayşe</cbc:FirstName><cbc:FamilyName>Örnek</cbc:FamilyName></cac:Person>" : "<cac:PartyName><cbc:Name>ÖRNEK KIRTASİYE &amp; OFİS LTD.ŞTİ.</cbc:Name></cac:PartyName>"}
  </cac:Party></cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty><cac:Party>
    <cac:PartyIdentification><cbc:ID schemeID="VKN">${customer}</cbc:ID></cac:PartyIdentification>
    <cac:PartyName><cbc:Name>ÖRNEK FİRMA</cbc:Name></cac:PartyName>
  </cac:Party></cac:AccountingCustomerParty>
  ${extra}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">210.00</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">1000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">200.00</cbc:TaxAmount><cbc:Percent>20</cbc:Percent>
      <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">100.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">10.00</cbc:TaxAmount><cbc:Percent>10.00</cbc:Percent>
      <cac:TaxCategory><cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal><cbc:TaxInclusiveAmount currencyID="TRY">1310.00</cbc:TaxInclusiveAmount><cbc:PayableAmount currencyID="TRY">1310.00</cbc:PayableAmount></cac:LegalMonetaryTotal>
  <cac:InvoiceLine><cbc:ID>1</cbc:ID><cac:TaxTotal><cbc:TaxAmount currencyID="TRY">200.00</cbc:TaxAmount>
    <cac:TaxSubtotal><cbc:TaxableAmount currencyID="TRY">1000.00</cbc:TaxableAmount><cbc:TaxAmount currencyID="TRY">200.00</cbc:TaxAmount><cbc:Percent>20</cbc:Percent>
    <cac:TaxCategory><cac:TaxScheme><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal></cac:TaxTotal></cac:InvoiceLine>
</Invoice>`;

describe("e-Fatura okuma", () => {
  it("fatura no, tarih, satıcı VKN/adı, alıcı VKN, KDV kırılımı ve ödenecek tutarı okur; satır KDV'lerini saymaz", () => {
    expect(parseInvoice(invoiceXml())).toEqual({
      number: "ABC2026000000412", date: "2026-09-08", type: "SATIS", profile: "TEMELFATURA", currency: "TRY",
      supplier: { taxNumber: "2222222224", name: "ÖRNEK KIRTASİYE & OFİS LTD.ŞTİ." }, customerTaxNumber: FIRM,
      vat: [{ rate: 20, taxableKurus: 100000, vatKurus: 20000 }, { rate: 10, taxableKurus: 10000, vatKurus: 1000 }],
      otherTax: false, withholding: false, payableKurus: 131000,
    });
  });

  it("e-Arşivde şahıs satıcının adını kişi alanından alır", () => {
    expect(parseInvoice(invoiceXml({ person: true, supplier: "10000000146" })).supplier).toEqual({ taxNumber: "10000000146", name: "Ayşe Örnek" });
  });

  it("DOCTYPE/ENTITY, Invoice olmayan kök ve bozuk XML'i reddeder", () => {
    const xxe = `<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><Invoice><ID>&e;</ID></Invoice>`;
    expect(() => parseInvoice(xxe)).toThrow(/DOCTYPE/);
    expect(() => parseInvoice(`<Invoice><ID>&undefined;</ID></Invoice>`)).toThrow(InvoiceError);
    expect(() => parseInvoice(`<CreditNote><ID>1</ID></CreditNote>`)).toThrow(/e-Fatura/);
    expect(() => parseInvoice(`<Invoice><ID>1`)).toThrow(InvoiceError);
    expect(() => parseInvoice("<a>".repeat(100))).toThrow(InvoiceError);
    expect(() => parseInvoice(`<Invoice>${"<a/>".repeat(25_000)}</Invoice>`)).toThrow(/çok fazla öğe/);
    const started = Date.now();
    expect(() => parseInvoice(`<Invoice>${`<${"x".repeat(60_000)}>`.repeat(30)}</Invoice>`)).toThrow(/öğe adı/);
    expect(Date.now() - started).toBeLessThan(500);
    const many = "<cac:TaxSubtotal><cbc:TaxableAmount>1</cbc:TaxableAmount><cbc:TaxAmount>0.2</cbc:TaxAmount><cbc:Percent>20</cbc:Percent><cac:TaxCategory><cac:TaxScheme><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme></cac:TaxCategory></cac:TaxSubtotal>".repeat(25);
    expect(() => parseInvoice(invoiceXml().replace("<cac:TaxTotal>", `<cac:TaxTotal>${many}`))).toThrow(/vergi satırı/);
  });

  it("ondalık tutarları float'a düşmeden kuruşa çevirir", () => {
    expect([decimalKurus("1310.00"), decimalKurus("0.1"), decimalKurus("2.345"), decimalKurus("2.344"), decimalKurus("1e3"), decimalKurus("1,5")]).toEqual([131000, 10, 235, 234, null, null]);
  });
});

describe("hangi faturalar taslak olur", () => {
  it("yalnız bu firmaya kesilmiş TRY satış faturası", () => {
    expect(skipReason(parseInvoice(invoiceXml()), FIRM)).toBeNull();
    expect(skipReason(parseInvoice(invoiceXml({ supplier: FIRM, customer: "2222222224" })), FIRM)).toMatch(/satış/);
    expect(skipReason(parseInvoice(invoiceXml({ customer: "3333333339" })), FIRM)).toMatch(/Alıcı/);
    expect(skipReason(parseInvoice(invoiceXml({ currency: "USD" })), FIRM)).toMatch(/Döviz/);
    expect(skipReason(parseInvoice(invoiceXml({ type: "IADE" })), FIRM)).toMatch(/İade faturası/);
    expect(skipReason(parseInvoice(invoiceXml({ extra: "<cac:WithholdingTaxTotal><cbc:TaxAmount>20</cbc:TaxAmount></cac:WithholdingTaxTotal>" })), FIRM)).toMatch(/Tevkifat/);
  });

  it("taslağın yevmiyesi dengeli: matrah + KDV borç, ödenecek tutar alacak", () => {
    const { lines, balanced } = buildJournalLines(invoiceData(parseInvoice(invoiceXml())), DEFAULT_RULES);
    expect(balanced).toBe(true);
    expect(lines.map((l) => [l.accountCode.slice(0, 3), l.debitKurus, l.creditKurus])).toEqual([["770", 100000, 0], ["191", 20000, 0], ["770", 10000, 0], ["191", 1000, 0], ["331", 0, 131000]]);
    expect(lines[0].documentNo).toBe("ABC2026000000412");
  });
});

describe("invoiceRules", () => {
  it("BT müşavirin girdiği gibi: e-Arşiv EA, e-Fatura EF; ödeme 320", () => {
    expect(invoiceRules(DEFAULT_RULES, "EARSIVFATURA").documentType).toBe("EA");
    expect(invoiceRules(DEFAULT_RULES, "TEMELFATURA").documentType).toBe("EF");
    expect(invoiceRules(DEFAULT_RULES, "TICARIFATURA").payment.other.code).toBe("320.01");
  });
});
