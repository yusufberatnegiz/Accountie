import "server-only";
import { NextResponse } from "next/server";
import { setGibScanUntil } from "@/db/queries";
import { FRESH_SIGN_IN_MS, getUserId, SIGN_IN_AGAIN, signedInWithin } from "@/lib/auth/session";
import { fail, NO_STORE, unauthorized } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

/** How long one approval lets the extension unseal GİB logins: a working day's scan, not more. */
const SCAN_GRANT_MS = 8 * 60 * 60_000;

/**
 * The user's own approval, from the signed-in site after a fresh sign-in, for the extension to unseal GİB logins for a while.
 * The extension key alone never opens a login: a stolen key without this approval opens nothing.
 */
export async function POST() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await signedInWithin(FRESH_SIGN_IN_MS))) return fail(SIGN_IN_AGAIN, 403);
  if (!(await allow("gibGrant", userId))) return fail("Çok fazla işlem yapıldı. Bir süre bekleyin.", 429);
  const until = new Date(Date.now() + SCAN_GRANT_MS);
  await setGibScanUntil(userId, until);
  return NextResponse.json({ until: until.toISOString() }, { headers: NO_STORE });
}

/** Ends the approval now: the extension can no longer unseal a login. Needs no fresh sign-in (it only takes access away). */
export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  await setGibScanUntil(userId, new Date(0));
  return new NextResponse(null, { status: 204 });
}
