import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteGibCredential, saveGibCredential } from "@/db/queries";
import { getSessionUser, getUserId, RECENT_SIGN_IN_MS, SIGN_IN_AGAIN, signedInWithin } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { login, logout, PortalError } from "@/lib/gib/earsiv";
import { seal, secretContext, secretKey } from "@/lib/gib/secret";
import { fail, readJson, unauthorized } from "@/lib/http";
import { allow, under } from "@/lib/rate-limit";

export const runtime = "nodejs";

// The portal's user code is the taxpayer's number or a short code; the password is printable, without control characters.
const SaveSchema = z.object({
  firma: z.uuid().optional(),
  kullaniciKodu: z.string().trim().regex(/^[0-9A-Za-z]{4,20}$/),
  sifre: z.string().min(1).max(64).regex(/^[^\p{Cc}]+$/u),
});

/**
 * Saves a firm's e-Arşiv portal login after GİB itself accepted it (one login and logout): a wrong password is never
 * stored, so it is never retried into a lockout. The login is sealed before it reaches the database and never sent back.
 */
export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const userId = user.id;
  if (!(await signedInWithin(RECENT_SIGN_IN_MS))) return fail(SIGN_IN_AGAIN, 403);
  const key = secretKey();
  if (!key) return fail("e-Arşiv bağlantısı bu sunucuda açık değil.", 503);
  const body = SaveSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Kullanıcı kodu ya da şifre geçersiz.", 400);
  const { firm } = await activeFirm(userId, body.data.firma ?? null);
  if (body.data.firma && body.data.firma !== firm.id) return fail("Firma bulunamadı.", 404);
  if (!firm.taxNumber) return fail("Önce Firmalar'da bu firmanın VKN'sini girin.", 422);
  const isNew = !(Date.now() - user.createdAt.getTime() >= 24 * 60 * 60_000);
  if (!(await under("gibCodeFail", body.data.kullaniciKodu)) || !(await allow("gib", userId)) || !(await allow("gibFirm", firm.id))
    || (isNew && !(await allow("gibNew", userId))) || !(await allow("gibGlobal", "all"))) {
    return fail("Çok fazla deneme yapıldı. Bir süre bekleyin; GİB hesabı kilitlenmesin.", 429);
  }

  try {
    await logout(await login(body.data.kullaniciKodu, body.data.sifre));
  } catch (e) {
    if (!(e instanceof PortalError)) throw e;
    if (e.kind !== "portal") await allow("gibCodeFail", body.data.kullaniciKodu); // only failures fill the shared bucket
    return fail(e.message, e.kind === "portal" ? 502 : 422);
  }
  try {
    await saveGibCredential(userId, firm.id, seal(key, body.data.kullaniciKodu, secretContext(userId, firm.id, "kullanici")), seal(key, body.data.sifre, secretContext(userId, firm.id, "sifre")));
  } catch (err) {
    // A driver error message carries the query parameters (the sealed login): log the error's name only.
    console.error("gib credential save failed", { error: err instanceof Error ? err.name : "unknown" });
    return fail("Bağlantı kaydedilemedi. Tekrar deneyin.", 500);
  }
  return NextResponse.json({ saved: true, firm: firm.name }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await signedInWithin(RECENT_SIGN_IN_MS))) return fail(SIGN_IN_AGAIN, 403);
  const wanted = new URL(request.url).searchParams.get("firma");
  const { firm } = await activeFirm(userId, wanted);
  if (wanted && wanted !== firm.id) return fail("Firma bulunamadı.", 404); // never fall back to another firm's login
  await deleteGibCredential(userId, firm.id);
  return new NextResponse(null, { status: 204 });
}
