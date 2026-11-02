import { NextResponse } from "next/server";
import { transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { notFound, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  if (!id.success || !(await transitionReceipt(userId, id.data, "approved", "draft"))) return notFound();
  return NextResponse.json({ status: "draft" });
}
