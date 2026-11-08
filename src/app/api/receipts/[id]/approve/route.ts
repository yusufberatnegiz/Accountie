import { NextResponse } from "next/server";
import { getReceipt, getRules, learnVendorRule, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, notFound, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { learnedAccount } from "@/lib/vendor-rule";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) return notFound();
  if (receipt.status !== "draft") return fail("Fiş zaten onaylı.", 409);
  const problem = approvalProblem(receipt.lines);
  if (problem) return fail(`Fiş onaylanamadı. ${problem}`, 422);
  if (!(await transitionReceipt(userId, receipt.id, "draft", "approved"))) return fail("Fiş durumu değişti. Sayfayı yenileyin.", 409);
  // The approval teaches this firm's seller its expense account (only a correction is kept). A failure here never undoes the approval.
  if (receipt.taxNumber && receipt.firmId) {
    const { rules } = await getRules(userId).catch(() => ({ rules: null }));
    const account = rules ? learnedAccount(receipt.lines, rules.expense[receipt.category ?? "other"] ?? rules.expense.other) : undefined;
    if (account !== undefined) await learnVendorRule(userId, receipt.firmId, receipt.taxNumber, receipt.vendorName, account).catch((e) => console.error("vendor rule not saved", e instanceof Error ? e.name : "unknown"));
  }
  return NextResponse.json({ status: "approved" });
}
