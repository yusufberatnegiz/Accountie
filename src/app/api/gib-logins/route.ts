import "server-only";
import { NextResponse } from "next/server";
import { deleteGibLogins } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** Deletes every stored GİB login of the user and ends the scan approval. Taking data away needs no fresh sign-in. */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await allow("gibGrant", userId))) return fail("Çok fazla işlem yapıldı. Bir süre bekleyin.", 429);
  const deleted = await deleteGibLogins(userId);
  return NextResponse.json({ deleted }, { headers: { "Cache-Control": "no-store" } });
}
