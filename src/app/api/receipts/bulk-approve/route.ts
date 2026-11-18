import { NextResponse } from "next/server";
import { z } from "zod";
import { getReceipt, getRules, learnVendorRule, transitionReceipt } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { planIndex } from "@/lib/plan-suggest";
import { learnedAccount } from "@/lib/vendor-rule";

export const runtime = "nodejs";

// The ids the list showed: a receipt that arrived since is never approved unseen.
const BulkApproveSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200), selected: z.boolean().optional() });

/**
 * Approves the given drafts whose lines pass; the rest stay drafts for review. Without `selected` (the list's "Uyarısız N fişi onayla")
 * only drafts with no warning; with it (receipts the user ticked) warnings are the user's call, as on one receipt's own screen, but an
 * undecided vehicle or a document with no fiscal value still waits.
 */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = BulkApproveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  let approved = 0;
  let stopped = false;
  // The firm's rules and plan, and the plan's codes, read and built once per firm, not once per receipt.
  const firms = new Map<string, Awaited<ReturnType<typeof firmOf>>>();
  const firmOf = async (firmId: string) => {
    const { rules, plan } = await getRules(userId, firmId);
    return { rules, index: planIndex(plan) };
  };
  // shortcut: one query pair per receipt (at most 200); batch it if lists grow.
  for (const id of new Set(body.data.ids)) {
    try {
      const receipt = await getReceipt(userId, id);
      if (!receipt || receipt.status !== "draft") continue;
      if (body.data.selected ? receipt.warnings.some((w) => w.code === "vehicle_choice" || w.code === "no_fiscal_value") : receipt.warnings.length > 0) continue;
      if (!receipt.firmId) continue;
      if (!firms.has(receipt.firmId)) firms.set(receipt.firmId, await firmOf(receipt.firmId));
      const firm = firms.get(receipt.firmId)!;
      // Codes the firm's Luca plan has, can post to and names the same (a mismatch waits for a look on its own screen).
      if (approvalProblem(receipt.lines, firm.index)) continue;
      if (!(await transitionReceipt(userId, id, "draft", "approved"))) continue;
      approved++;
      // As one approval does (src/app/api/receipts/[id]/approve/route.ts): the seller learns its account; a failure never undoes it.
      if (receipt.taxNumber && receipt.category !== "z_report" && receipt.category !== "foreign") {
        const account = learnedAccount(receipt.lines, firm.rules.expense[receipt.category ?? "other"] ?? firm.rules.expense.other);
        if (account !== undefined) await learnVendorRule(userId, receipt.firmId, receipt.taxNumber, receipt.vendorName, account).catch((e) => console.error("vendor rule not saved", e instanceof Error ? e.name : "unknown"));
      }
    } catch (err) {
      // The ones approved so far stay approved and are counted; the rest are said to be left, never "none approved".
      console.error("bulk approve stopped", { error: err instanceof Error ? err.name : "unknown" });
      stopped = true;
      break;
    }
  }
  return NextResponse.json({ approved, skipped: new Set(body.data.ids).size - approved, stopped });
}
