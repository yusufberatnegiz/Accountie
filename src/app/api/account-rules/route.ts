import { NextResponse } from "next/server";
import { getRules, saveRules } from "@/db/queries";
import { RulesPutSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { NO_STORE, fail, readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const { firm } = await activeFirm(userId);
  return NextResponse.json({ rows: (await getRules(userId, firm.id)).rows }, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = RulesPutSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Hesap kodu 770.08 biçiminde olmalı. Kuralları kontrol edin.", 400);
  // Kept per firm: Luca account codes differ from one client to the next.
  const { firm } = await activeFirm(userId);
  await saveRules(userId, body.data, firm.id);
  return NextResponse.json({ ok: true });
}
