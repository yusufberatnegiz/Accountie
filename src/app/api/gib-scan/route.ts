import "server-only";
import { NextResponse } from "next/server";
import { endGibScan, liveTokenHashes, setGibScanGrant } from "@/db/queries";
import { keyedHash } from "@/lib/auth/extension-token";
import { FRESH_SIGN_IN_MS, getUserId, SIGN_IN_AGAIN, signedInWithin } from "@/lib/auth/session";
import { grantText, mac, secretKey } from "@/lib/gib/secret";
import { fail, NO_STORE, unauthorized } from "@/lib/http";
import { allow, clientIp, ipBucket } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** How long one approval lets the extension unseal GİB logins: a scan's length, not a day. The extension ends it when it is done. */
const SCAN_GRANT_MS = 4 * 60 * 60_000;

/**
 * The user's own approval, from the signed-in site after a fresh sign-in, for the extension to unseal GİB logins for a while,
 * from this network and with the one extension key paired now only. Sealed with a MAC under the server's key: a row written straight into the database opens nothing.
 * The extension key alone never opens a login.
 */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await signedInWithin(FRESH_SIGN_IN_MS))) return fail(SIGN_IN_AGAIN, 403);
  const key = secretKey();
  if (!key) return fail("GİB girişlerini saklama bu sunucuda açık değil.", 503);
  if (!(await allow("gibGrant", userId))) return fail("Çok fazla işlem yapıldı. Bir süre bekleyin.", 429);
  // Pairing keeps one key per user (createExtensionToken): none means the extension is not connected, more means a key was
  // added outside Accountie, and nothing is approved for either.
  const tokens = await liveTokenHashes(userId);
  if (tokens.length !== 1) return fail(tokens.length ? "Eklenti anahtarında beklenmeyen bir durum var. Kurulum sayfasından eklentiyi yeniden bağlayın, sonra taramayı onaylayın." : "Önce eklentiyi bağlayın (Kurulum sayfası), sonra taramayı onaylayın.", 409);
  // Only a key stored with the server's key: an older one is moved on the extension's next request (open its window once).
  if (!keyedHash(tokens[0])) return fail("Eklenti bağlantısı güncellenmeli: eklenti penceresini bir kez açın, sonra taramayı onaylayın.", 409);
  const grantedAt = new Date();
  const until = new Date(grantedAt.getTime() + SCAN_GRANT_MS);
  const network = mac(key, "network", ipBucket(clientIp(request.headers)));
  const g = { userId, grantedAt, until, network, tokenHash: tokens[0] };
  await setGibScanGrant(userId, { until, grantedAt, network, tokenHash: g.tokenHash, mac: mac(key, "grant", grantText(g)) });
  return NextResponse.json({ until: until.toISOString() }, { headers: NO_STORE });
}

/** Ends the approval now: the extension can no longer unseal a login. Needs no fresh sign-in (it only takes access away). */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  await endGibScan(userId);
  return new NextResponse(null, { status: 204 });
}
