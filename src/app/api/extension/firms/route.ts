import { NextResponse } from "next/server";
import { importLucaFirm } from "@/db/queries";
import { LucaFirmSchema } from "@/lib/api-schemas";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail, readJson } from "@/lib/http";

export const runtime = "nodejs";

// The same cap as /api/firms.
const MAX_FIRMS = 2000;

/** One firm the extension read in Luca: its full name, VKN and chart of accounts. Safe to send again; the plan is replaced. */
export async function POST(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const body = LucaFirmSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Firma bilgisi okunamadı.", 400);
  const firm = await importLucaFirm(userId, body.data, MAX_FIRMS);
  if (!firm) return fail("Firma sınırına ulaşıldı.", 409);
  return NextResponse.json({ created: firm.created, accounts: body.data.accounts.length }, { status: firm.created ? 201 : 200, headers: { "Cache-Control": "no-store" } });
}
