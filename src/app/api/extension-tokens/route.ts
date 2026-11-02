import { NextResponse } from "next/server";
import { createExtensionToken, revokeExtensionTokens } from "@/db/queries";
import { EXTENSION_TOKEN_TTL_MS, hashToken, newExtensionToken } from "@/lib/auth/extension-token";
import { getUserId } from "@/lib/auth/session";
import { unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** New extension token for the session user; the previous one stops working. */
export async function POST() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const token = newExtensionToken();
  const expiresAt = new Date(Date.now() + EXTENSION_TOKEN_TTL_MS);
  await createExtensionToken(userId, hashToken(token), expiresAt);
  return NextResponse.json({ token, expiresAt: expiresAt.toISOString() }, { status: 201, headers: { "Cache-Control": "no-store" } });
}

export async function DELETE() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  await revokeExtensionTokens(userId);
  return new Response(null, { status: 204 });
}
