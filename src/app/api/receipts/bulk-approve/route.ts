import { NextResponse } from "next/server";
import { z } from "zod";
import { getReceipt, listFirmAccounts, transitionReceipt } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { leavesOf, planMismatches } from "@/lib/plan-suggest";

export const runtime = "nodejs";

// The ids the list showed: a receipt that arrived since is never approved unseen.
const BulkApproveSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });

/** Approves the given drafts that have no warning and balanced lines; the rest stay drafts for review. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = BulkApproveSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  let approved = 0;
  const plans = new Map<string, { code: string; name: string }[]>();
  // shortcut: one query pair per receipt (at most 200); batch it if lists grow.
  for (const id of new Set(body.data.ids)) {
    const receipt = await getReceipt(userId, id);
    if (!receipt || receipt.status !== "draft" || receipt.warnings.length > 0) continue;
    if (receipt.firmId && !plans.has(receipt.firmId)) plans.set(receipt.firmId, await listFirmAccounts(userId, receipt.firmId));
    const plan = receipt.firmId ? plans.get(receipt.firmId) ?? [] : [];
    if (approvalProblem(receipt.lines, plan.length ? new Set(plan.map((a) => a.code)) : undefined, plan.length ? new Set(leavesOf(plan).map((a) => a.code)) : undefined)) continue;
    // A line whose code means another account in the firm's Luca plan waits for a look on its own screen.
    if (planMismatches(receipt.lines, plan).length) continue;
    if (await transitionReceipt(userId, id, "draft", "approved")) approved++;
  }
  return NextResponse.json({ approved, skipped: new Set(body.data.ids).size - approved });
}
