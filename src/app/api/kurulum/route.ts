import { NextResponse } from "next/server";
import { setupStatus } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { NO_STORE, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** The setup wizard's checks: is an extension key there, and how many firms came in from Luca. Polled while step 3 waits. */
export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  return NextResponse.json(await setupStatus(userId), { headers: NO_STORE });
}
