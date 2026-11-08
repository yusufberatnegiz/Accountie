import { NextResponse } from "next/server";
import { createFirm, listFirms } from "@/db/queries";
import { FirmCreateSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { isValidTaxNumber } from "@/lib/checks";
import { firmCookie } from "@/lib/firm-cookie";
import { fail, readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

// A müşavir keeps a few hundred; the cap only stops a runaway client.
const MAX_FIRMS = 2000;

/** Adds a firm and makes it the panel's firm. */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = FirmCreateSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Firma adı en az 2 karakter olmalı; VKN 10, TCKN 11 haneli.", 400);
  const { name, taxNumber } = body.data;
  if (taxNumber && !isValidTaxNumber(taxNumber)) return fail("Vergi numarası geçerli görünmüyor. Haneleri kontrol edin.", 400);
  const firms = await listFirms(userId);
  if (firms.length >= MAX_FIRMS) return fail("Firma sınırına ulaşıldı.", 409);
  if (firms.some((f) => f.name.toLocaleLowerCase("tr") === name.toLocaleLowerCase("tr"))) return fail("Bu adla bir firma zaten var.", 409);
  const firm = await createFirm(userId, name, taxNumber ?? null);
  const res = NextResponse.json({ firm }, { status: 201 });
  res.cookies.set(firmCookie(firm.id));
  return res;
}
