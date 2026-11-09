import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteGibCredential, saveGibCredential } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { login, logout, PortalError } from "@/lib/gib/earsiv";
import { seal, secretContext, secretKey } from "@/lib/gib/secret";
import { fail, readJson, unauthorized } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

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
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const key = secretKey();
  if (!key) return fail("e-Arşiv bağlantısı bu sunucuda açık değil.", 503);
  const body = SaveSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Kullanıcı kodu ya da şifre geçersiz.", 400);
  const { firm } = await activeFirm(userId, body.data.firma ?? null);
  if (!(await allow("gib", userId)) || !(await allow("gibFirm", firm.id))) return fail("Çok fazla deneme yapıldı. Bir süre bekleyin; GİB hesabı kilitlenmesin.", 429);

  try {
    await logout(await login(body.data.kullaniciKodu, body.data.sifre));
  } catch (e) {
    if (!(e instanceof PortalError)) throw e;
    return fail(e.message, e.kind === "auth" ? 422 : 502);
  }
  await saveGibCredential(userId, firm.id, seal(key, body.data.kullaniciKodu, secretContext(userId, firm.id, "kullanici")), seal(key, body.data.sifre, secretContext(userId, firm.id, "sifre")));
  return NextResponse.json({ saved: true, firm: firm.name }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const wanted = new URL(request.url).searchParams.get("firma");
  const { firm } = await activeFirm(userId, wanted);
  await deleteGibCredential(userId, firm.id);
  return new NextResponse(null, { status: 204 });
}
