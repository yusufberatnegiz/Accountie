import { createReceipt, getVendorRule, hasDuplicateReceipt, type Firm, type NewReceipt } from "@/db/queries";
import { isValidTaxNumber } from "@/lib/checks";
import type { Rules } from "@/lib/default-rules";
import { InvoiceError, invoiceData, invoiceRules, parseInvoice, skipReason } from "@/lib/efatura";
import { buildJournalLines, warn } from "@/lib/journal";
import { withVendorAccount } from "@/lib/vendor-rule";

export type Skipped = { file: string; number: string | null; reason: string };

/**
 * UBL-TR invoice files (an upload, or what the e-Arşiv portal served) into the firm's draft receipts. Only plain TRY purchase
 * invoices addressed to the firm (its VKN is required by the callers) become drafts; a duplicate, an unreadable file or a
 * failed save is listed in `skipped` and the rest go on.
 */
export async function importInvoiceFiles(userId: string, firm: Firm, rules: Rules, files: readonly { name: string; data: Buffer }[]): Promise<{ ids: string[]; skipped: Skipped[] }> {
  const ids: string[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();
  const name = (f: { name: string }) => f.name.split(/[\\/]/).pop()!.slice(0, 120);

  for (const f of files) {
    let inv;
    try {
      inv = parseInvoice(f.data.toString("utf8"));
    } catch (e) {
      if (!(e instanceof InvoiceError)) throw e;
      skipped.push({ file: name(f), number: null, reason: e.message });
      continue;
    }
    const reason = skipReason(inv, firm.taxNumber);
    if (reason) { skipped.push({ file: name(f), number: inv.number, reason }); continue; }
    const vkn = inv.supplier.taxNumber && isValidTaxNumber(inv.supplier.taxNumber) ? inv.supplier.taxNumber : null;
    const key = `${vkn}|${inv.number}|${inv.date}`;
    if (seen.has(key) || (vkn && (await hasDuplicateReceipt(userId, vkn, inv.number, inv.date)))) {
      skipped.push({ file: name(f), number: inv.number, reason: "Bu fatura zaten yüklü." });
      continue;
    }
    seen.add(key);

    const data = invoiceData(inv);
    const learned = vkn ? await getVendorRule(userId, firm.id, vkn).catch(() => null) : null;
    const { lines, warnings } = buildJournalLines(data, withVendorAccount(invoiceRules(rules), data.category, learned && { code: learned.accountCode, name: learned.accountName }));
    const extra = [warn("efatura"), ...(inv.otherTax ? [warn("efatura_other_tax")] : []), ...(vkn ? [] : [warn("tax_number_invalid")])];
    const receipt: NewReceipt = {
      vendorName: data.vendorName,
      taxNumber: vkn,
      receiptNo: data.receiptNo,
      receiptDate: data.date,
      totalKurus: data.totalKurus,
      paymentMethod: data.paymentMethod,
      category: data.category,
      extraction: { source: "e-fatura", ...inv },
      warnings: [...extra, ...warnings.filter((w) => !extra.some((x) => x.code === w.code))],
      model: "e-fatura",
      inputTokens: 0,
      outputTokens: 0,
    };
    try {
      ids.push(await createReceipt(userId, firm.id, receipt, lines));
    } catch (err) {
      console.error("e-fatura save failed", { error: err instanceof Error ? err.name : "unknown" });
      skipped.push({ file: name(f), number: inv.number, reason: "Kaydedilemedi; tekrar yükleyin." });
    }
  }
  return { ids, skipped };
}
