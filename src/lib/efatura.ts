import { SaxesParser } from "saxes";
import type { Rules } from "./default-rules";
import type { ReceiptData } from "./journal";

/**
 * GİB e-Fatura / e-Arşiv invoices (UBL-TR XML) the müşavir downloaded from the GİB portal or the firm's integrator. No GİB
 * password, session or captcha is ever involved: the user brings the file. The XML is untrusted: a DOCTYPE or entity
 * declaration is refused outright (no XXE, no entity expansion), nesting and text are bounded, and only the fields below are read.
 */
export type Invoice = {
  number: string;
  date: string; // yyyy-mm-dd
  type: string; // SATIS, IADE, TEVKIFAT, ...
  currency: string;
  supplier: { taxNumber: string | null; name: string | null };
  customerTaxNumber: string | null;
  vat: { rate: number; taxableKurus: number; vatKurus: number }[];
  otherTax: boolean; // a tax besides KDV (ÖTV, konaklama vergisi, ...)
  withholding: boolean; // tevkifat
  payableKurus: number;
};

export class InvoiceError extends Error {}

const MAX_DEPTH = 40;
const MAX_ELEMENTS = 20_000; // a real UBL invoice has a few thousand at most
const MAX_TEXT = 1000;

/** "1234.5" -> 123450; a third decimal rounds half up. null when it is not a plain decimal. */
export function decimalKurus(s: string): number | null {
  const m = /^(-?)(\d{1,13})(?:\.(\d{1,6}))?$/.exec(s.trim());
  if (!m) return null;
  const frac = (m[3] ?? "").padEnd(3, "0");
  const v = Number(m[2]) * 100 + Number(frac.slice(0, 2)) + (Number(frac[2]) >= 5 ? 1 : 0);
  return m[1] ? -v : v;
}

const local = (name: string) => name.slice(name.indexOf(":") + 1);

/** Reads one UBL-TR Invoice. Throws InvoiceError (Turkish) when the file is not one or a needed field is missing. */
export function parseInvoice(xml: string): Invoice {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new InvoiceError("XML'de DOCTYPE ya da ENTITY bildirimi var; güvenlik için okunmadı.");
  const path: string[] = [];
  const attrs: Record<string, string>[] = [];
  let text = "";
  const got: Record<string, string> = {};
  const vat: Invoice["vat"] = [];
  let sub: { taxable?: string; amount?: string; percent?: string; code?: string } = {};
  let otherTax = false;
  let withholding = false;
  let supplierId: string | null = null;
  let customerId: string | null = null;
  const person: string[] = [];

  const parser = new SaxesParser({ xmlns: false });
  let elements = 0;
  parser.on("opentag", (node) => {
    if (++elements > MAX_ELEMENTS) throw new InvoiceError("XML'de çok fazla öğe var; fatura değil.");
    if (node.name.length > 100) throw new InvoiceError("XML'de geçersiz öğe adı; fatura değil."); // UBL's longest is under 40
    if (path.length >= MAX_DEPTH) throw new InvoiceError("XML çok derin; fatura değil.");
    path.push(local(node.name));
    attrs.push(node.attributes as Record<string, string>);
    text = "";
    if (path.length === 1 && path[0] !== "Invoice") throw new InvoiceError("Dosya bir e-Fatura (UBL Invoice) değil.");
    if (path.join("/") === "Invoice/WithholdingTaxTotal") withholding = true;
    if (path.join("/") === "Invoice/TaxTotal/TaxSubtotal") sub = {};
  });
  parser.on("text", (t) => {
    if (text.length < MAX_TEXT) text += t.slice(0, MAX_TEXT - text.length);
  });
  parser.on("closetag", () => {
    const p = path.join("/");
    const value = text.trim();
    const scheme = (attrs[attrs.length - 1]?.schemeID ?? "").toUpperCase();
    if (["Invoice/ID", "Invoice/IssueDate", "Invoice/InvoiceTypeCode", "Invoice/DocumentCurrencyCode", "Invoice/LegalMonetaryTotal/PayableAmount",
      "Invoice/AccountingSupplierParty/Party/PartyName/Name"].includes(p)) got[p] = value;
    const id = /^Invoice\/Accounting(Supplier|Customer)Party\/Party\/PartyIdentification\/ID$/.exec(p);
    if (id && (scheme === "VKN" || scheme === "TCKN")) {
      if (id[1] === "Supplier") supplierId = value; else customerId = value;
    }
    if (/^Invoice\/AccountingSupplierParty\/Party\/Person\/(FirstName|FamilyName)$/.test(p) && value) person.push(value);
    if (p === "Invoice/TaxTotal/TaxSubtotal/TaxableAmount") sub.taxable = value;
    if (p === "Invoice/TaxTotal/TaxSubtotal/TaxAmount") sub.amount = value;
    if (p === "Invoice/TaxTotal/TaxSubtotal/Percent") sub.percent = value;
    if (p === "Invoice/TaxTotal/TaxSubtotal/TaxCategory/TaxScheme/TaxTypeCode") sub.code = value;
    if (p === "Invoice/TaxTotal/TaxSubtotal") {
      if (vat.length >= 20) throw new InvoiceError("Faturada çok fazla vergi satırı var.");
      if (sub.code === "0015") {
        const taxable = decimalKurus(sub.taxable ?? ""), amount = decimalKurus(sub.amount ?? ""), rate = Number(sub.percent);
        if (taxable === null || amount === null || !Number.isFinite(rate)) throw new InvoiceError("KDV tutarları okunamadı.");
        if (Math.abs(taxable) > 1e12 || Math.abs(amount) > 1e12 || rate < 0 || rate > 100) throw new InvoiceError("KDV tutarları gerçek dışı.");
        vat.push({ rate, taxableKurus: taxable, vatKurus: amount });
      } else if (Number(sub.amount ?? 0) !== 0) otherTax = true;
    }
    path.pop();
    attrs.pop();
    text = "";
  });
  parser.on("error", (e) => { throw e; });
  try {
    parser.write(xml).close();
  } catch (e) {
    throw e instanceof InvoiceError ? e : new InvoiceError("XML okunamadı; dosya bozuk ya da fatura değil.");
  }

  const number = got["Invoice/ID"], date = got["Invoice/IssueDate"], payable = decimalKurus(got["Invoice/LegalMonetaryTotal/PayableAmount"] ?? "");
  if (payable !== null && Math.abs(payable) > 1e12) throw new InvoiceError("Fatura tutarı gerçek dışı.");
  if (!number || !/^\d{4}-\d{2}-\d{2}$/.test(date ?? "") || payable === null) throw new InvoiceError("Fatura no, tarih ya da ödenecek tutar yok.");
  return {
    number: number.slice(0, 40),
    date,
    type: (got["Invoice/InvoiceTypeCode"] ?? "").toUpperCase(),
    currency: (got["Invoice/DocumentCurrencyCode"] ?? "").toUpperCase(),
    supplier: { taxNumber: supplierId, name: (got["Invoice/AccountingSupplierParty/Party/PartyName/Name"] || person.join(" ") || null)?.slice(0, 200) ?? null },
    customerTaxNumber: customerId,
    vat,
    otherTax,
    withholding,
    payableKurus: payable,
  };
}

const TYPE_LABELS: Record<string, string> = {
  IADE: "İade faturası", TEVKIFAT: "Tevkifatlı fatura", ISTISNA: "İstisna faturası", OZELMATRAH: "Özel matrahlı fatura",
  IHRACKAYITLI: "İhraç kayıtlı fatura", SGK: "SGK faturası", KOMISYONCU: "Komisyoncu faturası", TEVKIFATIADE: "Tevkifat iade faturası",
};

/**
 * Why an invoice is not turned into a draft, or null when it is. Only plain TRY purchase invoices addressed to this firm:
 * returns, withholding and special types need a müşavir's hand, and a sales invoice of the firm's own must never become an expense.
 */
export function skipReason(inv: Invoice, firmTaxNumber: string | null): string | null {
  if (firmTaxNumber && inv.supplier.taxNumber === firmTaxNumber) return "Firmanın kendi kestiği fatura (satış); gider olarak alınmadı.";
  if (firmTaxNumber && inv.customerTaxNumber !== firmTaxNumber) return "Alıcı VKN'si bu firmanınki değil.";
  if (inv.currency !== "TRY") return `Döviz faturası (${inv.currency || "para birimi yok"}); elle girin.`;
  if (inv.type !== "SATIS") return `${TYPE_LABELS[inv.type] ?? (inv.type ? `${inv.type} tipli fatura` : "Tipi belirsiz fatura")}; elle girin.`;
  if (inv.withholding) return "Tevkifatlı fatura; elle girin.";
  if (inv.payableKurus <= 0) return "Ödenecek tutar yok.";
  return null;
}

/**
 * A purchase invoice is owed to its seller, not paid by a partner or from the till: 320, and BT FT instead of the ÖKC's ÖK.
 * shortcut: one 320.01 for every seller and BT "FT" are guesses at a common Luca plan, flagged on each draft; make them rules when a müşavir's plan says otherwise.
 */
export const invoiceRules = (rules: Rules): Rules => ({ ...rules, payment: { ...rules.payment, other: { code: "320.01", name: "Satıcılar" } }, documentType: "FT" });

/** The invoice as the receipt fields the journal builder takes (gross per KDV rate, the payable amount as total). */
export const invoiceData = (inv: Invoice): ReceiptData => ({
  vendorName: inv.supplier.name,
  receiptNo: inv.number,
  date: inv.date,
  vatLines: inv.vat.filter((v) => v.taxableKurus + v.vatKurus > 0).map((v) => ({ rate: v.rate, grossKurus: v.taxableKurus + v.vatKurus, vatKurus: v.vatKurus })),
  totalKurus: inv.payableKurus,
  paymentMethod: "other",
  category: "other",
});
