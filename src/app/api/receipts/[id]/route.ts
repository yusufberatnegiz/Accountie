import { NextResponse } from "next/server";
import { deleteDraft, getReceipt, replaceLines } from "@/db/queries";
import { idSchema, PatchReceiptSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { NO_STORE, fail, notFound, readJson, unauthorized } from "@/lib/http";
import { isBalanced } from "@/lib/journal";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  return receipt ? NextResponse.json({ receipt, balanced: isBalanced(receipt.lines) }, { headers: NO_STORE }) : notFound();
}

export async function PATCH(request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) return notFound();
  if (receipt.status !== "draft") return fail("Sadece taslak fiş düzenlenebilir. Önce taslağa alın.", 409);
  const body = PatchReceiptSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Satırlarda geçersiz değer var.", 400);
  if (!(await replaceLines(userId, receipt.id, body.data.lines))) return fail("Sadece taslak fiş düzenlenebilir. Önce taslağa alın.", 409);
  return NextResponse.json({ balanced: isBalanced(body.data.lines) });
}

export async function DELETE(_request: Request, { params }: Ctx) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success) return notFound();
  if (await deleteDraft(userId, id.data)) return new NextResponse(null, { status: 204 });
  return (await getReceipt(userId, id.data)) ? fail("Sadece taslak fiş silinebilir.", 409) : notFound();
}
