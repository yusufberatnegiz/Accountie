import { NextResponse } from "next/server";
import { getReceipt, getRules, getVendorRule, reopenRebuilt, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { isValidTaxNumber } from "@/lib/checks";
import { notFound, unauthorized } from "@/lib/http";
import { approvalProblem, linesProblem } from "@/lib/journal";
import { planIndex } from "@/lib/plan-suggest";
import { linesFor, rebuiltWarnings, type StoredExtraction } from "@/lib/rebuild";

export const runtime = "nodejs";

/**
 * Back to draft. A receipt whose lines no longer pass its firm's Luca plan (approved before the plan came, or the plan changed) is
 * rebuilt from its reading with the rules fitted to the plan; one that passes keeps its lines, hand edits included.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt || receipt.status !== "approved") return notFound();
  const fitted = receipt.firmId ? await getRules(userId, receipt.firmId) : null;
  const x = receipt.extraction as StoredExtraction | null;
  const offPlan = !!fitted?.plan.length && !linesProblem(receipt.lines) && !!approvalProblem(receipt.lines, planIndex(fitted.plan));
  if (fitted && x && offPlan) {
    const tax = receipt.category !== "z_report" && receipt.category !== "foreign" && receipt.taxNumber && isValidTaxNumber(receipt.taxNumber) ? receipt.taxNumber : null;
    const learned = tax && receipt.firmId ? await getVendorRule(userId, receipt.firmId, tax).catch(() => null) : null;
    const built = linesFor(x, fitted.rules, learned && { code: learned.accountCode, name: learned.accountName }, fitted.plan);
    if (!(await reopenRebuilt(userId, receipt.id, built.lines, rebuiltWarnings(receipt.warnings, built)))) return notFound();
    return NextResponse.json({ status: "draft", rebuilt: true });
  }
  if (!(await transitionReceipt(userId, receipt.id, "approved", "draft"))) return notFound();
  return NextResponse.json({ status: "draft" });
}
