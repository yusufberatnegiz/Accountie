import { markExported, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** The user entered an approved receipt in Luca by hand; mark it exported so no later Excel file repeats it. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound();
  await markExported(userId, [id.data]);
  return new Response(null, { status: 204 });
}

/** Undo: the receipt was not (or no longer) in Luca; back to approved, so the extension and the next Excel file list it again. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success || !(await transitionReceipt(userId, id.data, "exported", "approved"))) return notFound();
  return new Response(null, { status: 204 });
}
