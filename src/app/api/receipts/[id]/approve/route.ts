import { NextResponse } from "next/server";
import { getReceipt, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, notFound, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";

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
  return NextResponse.json({ status: "approved" });
}
