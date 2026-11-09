import { NextResponse } from "next/server";
import { getRules, saveRules } from "@/db/queries";
import { RulesPutSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { NO_STORE, fail, readJson, unauthorized } from "@/lib/http";

export const runtime = "nodejs";

export async function GET() {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  return NextResponse.json({ rows: (await getRules(userId)).rows }, { headers: NO_STORE });
}

export async function PUT(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = RulesPutSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Hesap kodu 770.08 biçiminde olmalı. Kuralları kontrol edin.", 400);
  await saveRules(userId, body.data);
  return NextResponse.json({ ok: true });
}
