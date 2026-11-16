import { NextResponse } from "next/server";
import { clearFirmRules, getRules, listFirmAccounts, saveRules } from "@/db/queries";
import { RulesDeleteSchema, RulesPutSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";
import { NO_STORE, fail, readJson, unauthorized } from "@/lib/http";
import { leavesOf } from "@/lib/plan-suggest";

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
  const { firm } = await activeFirm(userId, body.data.firmId);
  if (body.data.firmId && body.data.firmId !== firm.id) return fail("Firma bulunamadı.", 404); // never another firm's rules
  // With the firm's Luca plan imported, a code Luca does not have, or one with sub-accounts, would only fail at approval.
  const plan = await listFirmAccounts(userId, firm.id);
  if (plan.length) {
    const postable = new Set(leavesOf(plan).map((a) => a.code));
    const names = new Map(plan.map((a) => [a.code, a.name]));
    const bad = body.data.rows.find((r) => r.kind !== "setting" && !postable.has(r.accountCode));
    if (bad) return fail(names.has(bad.accountCode) ? `${bad.accountCode} hesabının alt hesapları var; alt hesaplardan birini seçin.` : `${bad.accountCode} firmanın Luca planında yok. Plandaki bir kodu seçin.`, 400);
    // The name Luca gives the code, so no receipt later reads as booked to another account (plan_name).
    body.data.rows = body.data.rows.map((r) => (r.kind !== "setting" && names.has(r.accountCode) ? { ...r, accountName: names.get(r.accountCode)! } : r));
  }
  await saveRules(userId, body.data.rows, firm.id);
  return NextResponse.json({ ok: true });
}

/** Forgets the firm's own rules: every rule is fitted to its Luca plan again (or the user's rules, without a plan). */
export async function DELETE(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = RulesDeleteSchema.safeParse(await readJson(request));
  if (!body.success) return fail("Geçersiz istek.", 400);
  const { firm } = await activeFirm(userId, body.data.firmId);
  if (firm.id !== body.data.firmId) return fail("Firma bulunamadı.", 404);
  await clearFirmRules(userId, firm.id);
  return NextResponse.json({ rows: (await getRules(userId, firm.id)).rows }, { headers: NO_STORE });
}
