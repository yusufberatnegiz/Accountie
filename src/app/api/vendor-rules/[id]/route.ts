import { NextResponse } from "next/server";
import { deleteVendorRule } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** Forgets one learned seller account; the seller's next receipts follow the category rule again. Only the user's own rows. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success || !(await deleteVendorRule(userId, id.data))) return fail("Kural bulunamadı.", 404);
  return NextResponse.json({ deleted: true });
}
