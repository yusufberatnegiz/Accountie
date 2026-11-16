import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteDrafts } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

// The ids the list showed: a draft that arrived since is never deleted unseen.
const BulkDeleteSchema = z.object({ ids: z.array(z.uuid()).min(1).max(200) });

/** Deletes the given drafts; approved and transferred receipts are never deleted here. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = BulkDeleteSchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return fail("Geçersiz istek.", 400);
  const ids = [...new Set(body.data.ids)];
  const deleted = await deleteDrafts(userId, ids);
  return NextResponse.json({ deleted, skipped: ids.length - deleted });
}
