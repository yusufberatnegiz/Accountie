import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { endGibScan, liveTokenHashes, setGibScanGrant } from "@/db/queries";
import { bearerHash, keyedHash } from "@/lib/auth/extension-token";
import { getUserId } from "@/lib/auth/session";
import { fail, NO_STORE, readJson, unauthorized } from "@/lib/http";
import { allow, clientIp, ipBucket } from "@/lib/rate-limit";
import { grantText, mac, secretKey } from "./secret";

const SCAN_GRANT_MS = 4 * 60 * 60_000;
// The site's "Seçilenleri tara": the firms to scan. No body (or no list): every firm.
const Chosen = z.object({ lucaIds: z.array(z.string().regex(/^\d{1,12}$/)).min(1).max(2000) });

/** Open access for the signed-in account's sole paired key on this network; from the site, optionally for chosen firms only. */
export async function grantGibScan(request: Request, source: "web" | "extension") {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const key = secretKey();
  if (!key) return fail("GİB girişlerini saklama bu sunucuda açık değil.", 503);
  if (!(await allow("gibGrant", userId))) return fail("Çok fazla işlem yapıldı. Bir süre bekleyin.", 429);

  const tokens = await liveTokenHashes(userId);
  if (tokens.length !== 1 || !keyedHash(tokens[0])) return fail("Kurulum sayfasında eklentiyi yeniden bağlayıp taramayı başlatın.", 409);
  const tokenHash = tokens[0];
  if (source === "extension" && bearerHash(request) !== tokenHash) {
    return fail("Eklenti bu Accountie hesabına bağlı değil. Kurulum sayfasından yeniden bağlayın.", 403);
  }

  const body = source === "web" && request.headers.get("content-type")?.includes("application/json") ? Chosen.safeParse(await readJson(request)) : null;
  if (body && !body.success) return fail("Seçilen firmalar okunamadı.", 400);
  const firms = body ? [...new Set(body.data.lucaIds)] : null;

  const grantedAt = new Date();
  const until = new Date(grantedAt.getTime() + SCAN_GRANT_MS);
  const network = mac(key, "network", ipBucket(clientIp(request.headers)));
  const grant = { until, grantedAt, network, tokenHash };
  await setGibScanGrant(userId, { ...grant, mac: mac(key, "grant", grantText({ userId, ...grant })), firms });
  return NextResponse.json({ until: until.toISOString() }, { headers: NO_STORE });
}

export async function closeGibScan(request: Request, userId: string) {
  const expected = new URL(request.url).searchParams.get("until");
  if (expected === null) await endGibScan(userId);
  else {
    const until = new Date(expected);
    if (!Number.isFinite(until.getTime()) || until.toISOString() !== expected) return fail("Tarama erişim süresi geçersiz.", 400);
    await endGibScan(userId, until);
  }
  return new NextResponse(null, { status: 204 });
}
