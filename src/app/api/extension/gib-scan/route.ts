import "server-only";
import { NextResponse } from "next/server";
import { endGibScan } from "@/db/queries";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail } from "@/lib/http";

export const runtime = "nodejs";

/** The extension ends the scan approval when its scan is done or stopped: nothing stays open for the hours left. */
export async function DELETE(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  await endGibScan(userId);
  return new NextResponse(null, { status: 204 });
}
