import { NextResponse } from "next/server";
import { getReceipt, transitionReceipt } from "@/db/queries";
import { idSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, notFound, unauthorized } from "@/lib/http";
import { isBalanced } from "@/lib/journal";
import { formatTrAmount } from "@/lib/money";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const id = idSchema.safeParse((await params).id);
  const receipt = id.success ? await getReceipt(userId, id.data) : null;
  if (!receipt) return notFound();
  if (receipt.status !== "draft") return fail("Fiş zaten onaylı.", 409);
  if (!isBalanced(receipt.lines)) {
    const diff = receipt.lines.reduce((s, l) => s + l.debitKurus - l.creditKurus, 0);
    return fail(`Fiş dengeli değil. Borç ile alacak farkı ${formatTrAmount(Math.abs(diff))} TL. Her satırda hesap kodu ve tek taraflı tutar olmalı.`, 422);
  }
  if (!(await transitionReceipt(userId, receipt.id, "draft", "approved"))) return fail("Fiş durumu değişti. Sayfayı yenileyin.", 409);
  return NextResponse.json({ status: "approved" });
}
