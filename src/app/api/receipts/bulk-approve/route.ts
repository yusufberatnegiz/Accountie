import { NextResponse } from "next/server";
import { z } from "zod";
import { getReceipt, transitionReceipt } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";

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
  // shortcut: one query pair per receipt (at most 200); batch it if lists grow.
  for (const id of new Set(body.data.ids)) {
    const receipt = await getReceipt(userId, id);
    if (!receipt || receipt.status !== "draft" || receipt.warnings.length > 0 || approvalProblem(receipt.lines)) continue;
    if (await transitionReceipt(userId, id, "draft", "approved")) approved++;
  }
  return NextResponse.json({ approved, skipped: new Set(body.data.ids).size - approved });
}
