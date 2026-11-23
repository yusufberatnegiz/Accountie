import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { gibScanGrant, takeGibLogin } from "@/db/queries";
import { bearerHash, extensionUserId } from "@/lib/auth/extension-token";
import { grantText, mac, macOk, open, secretContext, secretKey, SecretError } from "@/lib/gib/secret";
import { fail, readJson } from "@/lib/http";
import { allow, clientIp, ipBucket } from "@/lib/rate-limit";

export const runtime = "nodejs";

const Body = z.object({ lucaId: z.string().regex(/^\d{1,12}$/) });
// A firm's login opened at most this many times per approval: a stop and resume or a page that did not load, never a sweep.
const READS_PER_FIRM = 3;

/**
 * One firm's GİB login, unsealed for the extension to fill Dijital Vergi Dairesi's form while the user types the captcha. Locks:
 * the extension key; the user's own approval from the signed-in site, checked by its MAC under the server's key (a row written
 * into the database opens nothing), its end time and its network (the key used elsewhere opens nothing); buckets slower than a
 * human logging in; a few opens per firm per approval. Every unsealing is recorded in the same transaction. Never cached or logged.
 */
export async function POST(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const key = secretKey();
  if (!key) return fail("GİB girişlerini saklama bu sunucuda açık değil.", 503);
  const grant = await gibScanGrant(userId);
  const network = mac(key, "network", ipBucket(clientIp(request.headers)));
  const approved = !!grant && grant.until.getTime() > Date.now() && macOk(key, "grant", grantText({ userId, ...grant }), grant.mac);
  if (!approved) return fail("Tarama erişimi açık değil. Accountie'nin e-Tebligat sayfasından taramayı başlatın.", 403);
  // Only the key the user had when approving: another key of this user (one added to the database) opens nothing.
  if (bearerHash(request) !== grant.tokenHash) return fail("Tarama erişimi başka bir eklenti bağlantısı için açıldı. Accountie'den taramayı yeniden başlatın.", 403);
  if (grant.network !== network) return fail("Tarama erişimi başka bir ağdan açıldı. Bu bilgisayardan Accountie'ye girip taramayı yeniden başlatın.", 403);
  if (!(await allow("gibRead", userId)) || !(await allow("gibReadIp", clientIp(request.headers)))) return fail("Çok hızlı istendi; güvenlik için durduruldu. Birkaç dakika sonra sürdürün.", 429);
  const body = Body.safeParse(await readJson(request));
  if (!body.success) return fail("Firma okunamadı.", 400);
  const row = await takeGibLogin(userId, body.data.lucaId, network, grant.grantedAt, READS_PER_FIRM);
  if (row === "spent") return fail("Bu firmanın girişi bu taramada açma sınırına ulaştı. Accountie'den taramayı yeniden başlatın.", 409);
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
