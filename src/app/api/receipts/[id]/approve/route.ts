import { NextResponse } from "next/server";
import { getReceipt, getRules, learnVendorRule, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, notFound, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { planIndex } from "@/lib/plan-suggest";
import { learnedAccount } from "@/lib/vendor-rule";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) return notFound();
  if (receipt.status !== "draft") return fail("Fiş zaten onaylı.", 409);
  // Once the firm's Luca plan is imported, a code Luca does not have is caught here instead of at transfer. The rules come with
  // the plan (one read), and teach the seller below.
  // A: an undecided vehicle; B: a document with no fiscal value. The screen stops both; so does the server.
  const blocked = receipt.warnings.find((w) => w.code === "vehicle_choice" || w.code === "no_fiscal_value");
  if (blocked) return fail(`Fiş onaylanamadı. ${blocked.code === "vehicle_choice" ? "Araç binek mi ticari mi, seçin." : "Mali değeri olmayan belge onaylanmaz; bu taslağı silin."}`, 422);
  const fitted = receipt.firmId ? await getRules(userId, receipt.firmId) : null;
  const plan = fitted?.plan ?? [];
  const problem = approvalProblem(receipt.lines, planIndex(plan));
  if (problem) return fail(`Fiş onaylanamadı. ${problem}`, 422);
  if (!(await transitionReceipt(userId, receipt.id, "draft", "approved"))) return fail("Fiş durumu değişti. Sayfayı yenileyin.", 409);
  // The approval teaches this firm's seller its expense account (only a correction is kept). A failure here never undoes the approval.
  // A Z report carries the firm's own VKN and a foreign invoice none: only receipts teach a seller.
  if (receipt.taxNumber && receipt.firmId && receipt.category !== "z_report" && receipt.category !== "foreign") {
    const rules = fitted?.rules;
    const account = rules ? learnedAccount(receipt.lines, rules.expense[receipt.category ?? "other"] ?? rules.expense.other) : undefined;
    if (account !== undefined) await learnVendorRule(userId, receipt.firmId, receipt.taxNumber, receipt.vendorName, account).catch((e) => console.error("vendor rule not saved", e instanceof Error ? e.name : "unknown"));
  }
  return NextResponse.json({ status: "approved" });
}
