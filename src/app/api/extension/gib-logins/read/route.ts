import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gibScanUntil, takeGibLogin } from "@/db/queries";
import { extensionUserId } from "@/lib/auth/extension-token";
import { open, secretContext, secretKey, SecretError } from "@/lib/gib/secret";
import { fail, readJson } from "@/lib/http";
import { allow, clientIp, ipBucket } from "@/lib/rate-limit";
import { createHash } from "node:crypto";

export const runtime = "nodejs";

const Body = z.object({ lucaId: z.string().regex(/^\d{1,12}$/) });

/**
 * One firm's GİB login, unsealed for the extension to fill Dijital Vergi Dairesi's form while the user types the captcha. Three
 * locks: the extension key, the user's own approval from the signed-in site (a few hours), and buckets slower than a human
 * logging in. Every unsealing is recorded, in the same transaction that reads the row. Never cached, never logged.
 */
export async function POST(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const key = secretKey();
  if (!key) return fail("GİB girişlerini saklama bu sunucuda açık değil.", 503);
  const until = await gibScanUntil(userId);
  if (!until || until.getTime() <= Date.now()) return fail("Tarama onaylı değil. Accountie'de e-Tebligatlar sayfasında Taramayı onayla'ya basın.", 403);
  const net = clientIp(request.headers);
  if (!(await allow("gibRead", userId)) || !(await allow("gibReadIp", net))) return fail("Çok hızlı istendi; güvenlik için durduruldu. Birkaç dakika sonra sürdürün.", 429);
  const body = Body.safeParse(await readJson(request));
  if (!body.success) return fail("Firma okunamadı.", 400);
  const network = createHash("sha256").update(ipBucket(net)).digest("hex").slice(0, 16);
  const row = await takeGibLogin(userId, body.data.lucaId, network);
  if (!row) return fail("Bu firmanın kayıtlı GİB girişi yok. Firmaları Luca'dan yeniden çekin.", 404);
  try {
    const username = open(key, row.usernameSealed, secretContext(userId, row.firmId, "kullanici"));
    const password = open(key, row.passwordSealed, secretContext(userId, row.firmId, "sifre"));
    return NextResponse.json({ username, password }, { headers: { "Cache-Control": "no-store, max-age=0", Pragma: "no-cache" } });
  } catch (err) {
    if (!(err instanceof SecretError)) throw err;
    return fail("Bu firmanın kayıtlı girişi açılamadı. Firmaları Luca'dan yeniden çekin.", 409);
  }
}
