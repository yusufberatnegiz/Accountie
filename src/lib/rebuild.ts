import type { Account, Rules } from "./default-rules";
import { kindOf, toForeignData, toReceiptData, toSalesData, type ReceiptExtraction } from "./extract/schema";
import { buildJournalLines, warn, type JournalLine, type Warning } from "./journal";
import { buildForeignLines, buildSalesLines, type FxRate } from "./journal-kinds";
import { departmentAccounts } from "./plan-suggest";
import { withVendorAccount } from "./vendor-rule";

/** A read document as stored on its receipt: the reading, and for a foreign invoice the TL rate taken at upload. */
export type StoredExtraction = ReceiptExtraction & { fx?: FxRate | null; vehicle?: string };

/**
 * The lines a read document books to with the firm's rules (fitted to its Luca plan): one place for the upload, a draft rebuilt on
 * reopening, and the check against real receipts. `learned`: the seller's expense account the firm's approvals taught; `plan`: the
 * firm's Luca plan, for a Z report's departments and a ticket's Bilet Cari account.
 */
export function linesFor(x: StoredExtraction, rules: Rules, learned: Account | null = null, plan: readonly Account[] = []): { lines: JournalLine[]; warnings: Warning[] } {
  const kind = kindOf(x);
  // A Z report's departments go to the firm's own sales account for each, found in its Luca plan.
  if (kind === "z_report") return buildSalesLines(toSalesData(x), rules, departmentAccounts(plan));
  if (kind === "foreign_invoice") return buildForeignLines(toForeignData(x), rules, x.fx ?? null);
  const data = toReceiptData(x);
  const cari = kind === "domestic_invoice" && data.category === "transport" ? ticketAccount(plan) : undefined;
  return buildJournalLines(data, {
    ...withVendorAccount(rules, data.category, learned),
    ...(kind === "domestic_invoice" && { documentType: rules.foreign.documentType }),
    ...(cari && { payment: { cash: cari, card: cari, other: cari } }),
  });
}

/** A ticket is owed to the firm's own "Bilet Cari" account (a 3xx account in its Luca plan) when the plan has exactly one. */
export function ticketAccount(plan: readonly Account[]): Account | undefined {
  const hits = plan.filter((a) => a.code.startsWith("3") && /bilet\s*cari/.test(a.name.toLocaleLowerCase("tr")));
  return hits.length === 1 ? { code: hits[0].code, name: hits[0].name } : undefined;
}

// Warnings the rebuild says again from the new lines, or that no longer hold once they are rebuilt.
const REDONE = ["plan_no_account", "plan_name", "plan_rebuilt", "vehicle_choice"];

/** The warnings a rebuilt draft carries: the new lines' own, the reading's (kept), a missing code, and that it was rebuilt. */
export function rebuiltWarnings(old: readonly Warning[], built: { lines: readonly JournalLine[]; warnings: readonly Warning[] }): Warning[] {
  const out = [warn("plan_rebuilt"), ...built.warnings];
  if (built.lines.some((l) => !l.accountCode)) out.push(warn("plan_no_account"));
  for (const w of old) if (!REDONE.includes(w.code) && !out.some((o) => o.code === w.code)) out.push(w);
  return out;
}
