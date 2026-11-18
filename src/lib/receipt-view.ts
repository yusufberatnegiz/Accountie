import "server-only";
import { getReceipt, getRules, getVendorRule, nextDraft } from "@/db/queries";
import { leavesOf, planMismatches, planMismatchWarning } from "@/lib/plan-suggest";

/** Everything the review screen needs for one receipt: the full page (/panel/fis/[id]) and the list, under the receipt's row (?fis=), both load it here. */
export async function loadReceiptView(userId: string, id: string) {
  const receipt = await getReceipt(userId, id);
  if (!receipt) return null;
  const [{ rules, plan }, next, vendor] = await Promise.all([
    getRules(userId, receipt.firmId),
    nextDraft(userId, receipt.firmId, id),
    receipt.taxNumber && receipt.firmId ? getVendorRule(userId, receipt.firmId, receipt.taxNumber) : null,
  ]);
  // A draft built before the rules followed the firm's Luca plan may carry a code that means another account there.
  const mismatches = receipt.status === "draft" ? planMismatches(receipt.lines, plan) : [];
  if (mismatches.length) receipt.warnings = [planMismatchWarning(mismatches), ...receipt.warnings];
  // Named only on a draft that still carries it: an approved receipt's account is its own approval, a line changed by hand the user's choice.
  const learned = vendor && receipt.status === "draft" && receipt.lines.some((l) => l.accountCode === vendor.accountCode && l.debitKurus > 0) ? vendor : null;
  // The plan (thousands of accounts) goes only to a draft, the one screen that picks codes from it.
  const draft = receipt.status === "draft";
  return { receipt, rules, next, learned, plan: draft ? plan : [], postable: draft ? leavesOf(plan).map(({ code, name }) => ({ code, name })) : [], mismatched: mismatches.map((m) => m.code) };
}
