import { NextResponse } from "next/server";
import { saveNotices } from "@/db/queries";
import { NoticesSchema } from "@/lib/api-schemas";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail, NO_STORE, readJson } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

/**
 * One firm's e-Tebligat list, read by the extension from the Dijital Vergi Dairesi session the user opened. Only list header fields
 * arrive (no GİB token, no document). Matched to the user's firm by the session's VKN/TCKN.
 */
export async function POST(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  if (!(await allow("notices", userId))) return fail("Çok sık gönderildi. Biraz bekleyip tekrar deneyin.", 429);
  const body = NoticesSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Tebligat listesi okunamadı.", 400);
  const saved = await saveNotices(userId, body.data.idNumbers, body.data.notices);
  if (!saved) return fail(`Bu vergi numarası (${body.data.idNumbers.join(" / ")}) Accountie'deki firmalarınızda yok. Önce firmayı Luca'dan çekin.`, 404);
  return NextResponse.json({ firm: saved.firm.name, fresh: saved.fresh, total: saved.total }, { headers: NO_STORE });
}
