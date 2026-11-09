import { NextResponse } from "next/server";
import { listExportedForCheck } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { fail, unauthorized } from "@/lib/http";
import { MuavinError, readMuavin, reconcile } from "@/lib/luca/muavin";
import { isMonth } from "@/lib/month";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request body limit

/**
 * Compares a month of the firm's exported receipts with the muavin Excel the user downloaded from Luca. The file is read in
 * memory and dropped: nothing of it is stored or logged.
 */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await allow("reconcile", userId))) return fail("Çok fazla karşılaştırma yapıldı. Biraz bekleyip tekrar deneyin.", 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return fail("Dosya 4 MB'tan büyük olamaz.", 413);
  const form = await request.formData().catch(() => null);
  const file = form?.get("dosya");
  const month = form?.get("ay");
  if (!(file instanceof File) || !isMonth(month)) return fail("Muavin dosyası ya da ay eksik.", 400);
  if (file.size > MAX_BYTES) return fail("Dosya 4 MB'tan büyük olamaz.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());
  // An .xlsx is a zip: anything else is refused before the parser sees it.
  if (bytes[0] !== 0x50 || bytes[1] !== 0x4b) return fail("Dosya Excel (.xlsx) değil. Luca'dan muavini Excel olarak indirin.", 415);
  const wanted = form?.get("firma");
  const { firm } = await activeFirm(userId, typeof wanted === "string" ? wanted : null);
  if (typeof wanted === "string" && wanted !== firm.id) return fail("Firma bulunamadı.", 404); // never another firm's data
  try {
    const [rows, receipts] = await Promise.all([readMuavin(bytes), listExportedForCheck(userId, firm.id, month)]);
    return NextResponse.json({ firm: firm.name, month, rowCount: rows.length, ...reconcile(receipts, rows) }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    if (e instanceof MuavinError) return fail(e.message, 422);
    throw e;
  }
}
