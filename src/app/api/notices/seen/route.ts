import { NextResponse } from "next/server";
import { markNoticesSeen } from "@/db/queries";
import { NoticesSeenSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, NO_STORE, readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** "Gördüm": the given new notices stop showing as new. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = NoticesSeenSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Geçersiz istek.", 400);
  return NextResponse.json({ seen: await markNoticesSeen(userId, body.data.ids) }, { headers: NO_STORE });
}
