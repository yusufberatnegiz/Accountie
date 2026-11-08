import { NextResponse } from "next/server";
import { listFirms } from "@/db/queries";
import { FirmActiveSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { firmCookie } from "@/lib/firm-cookie";
import { fail, readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

/** Switches the panel to one of the user's own firms. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = FirmActiveSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Geçersiz istek.", 400);
  const firm = (await listFirms(userId)).find((f) => f.id === body.data.id);
  if (!firm) return fail("Firma bulunamadı.", 404);
  const res = NextResponse.json({ firm });
  res.cookies.set(firmCookie(firm.id));
  return res;
}
