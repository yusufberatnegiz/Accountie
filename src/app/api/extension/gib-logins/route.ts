import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { firmsByLucaId, gibScanUntil, listGibLoginFirms, saveGibLogins } from "@/db/queries";
import { extensionUserId } from "@/lib/auth/extension-token";
import { seal, secretContext, secretKey } from "@/lib/gib/secret";
import { fail, NO_STORE, readJson } from "@/lib/http";
import { allow } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Luca's GİB Şirket rows as the extension reads them on a firm import. A row that does not fit is dropped, not the whole batch.
const GibLoginRow = z.object({
  lucaId: z.string().regex(/^\d{1,12}$/),
  username: z.string().trim().regex(/^[0-9A-Za-z]{1,40}$/),
  password: z.string().min(1).max(64).regex(/^[^\p{Cc}]+$/u),
});
const Batch = z.object({ logins: z.array(z.unknown()).min(1).max(250) });

/** Firms with a stored login (never the login) and until when the user allowed the scan: what the scan page plans with. */
export async function GET(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const [firms, until] = await Promise.all([listGibLoginFirms(userId), gibScanUntil(userId)]);
  return NextResponse.json({
    firms: firms.map(({ lucaId, name, taxNumber }) => ({ lucaId, name, taxNumber })),
    scanUntil: until && until.getTime() > Date.now() ? until.toISOString() : null,
    enabled: !!secretKey(),
  }, { headers: NO_STORE });
}

/**
 * Logins read from the müşavir's Luca on a firm import: sealed here, bound to the user and the firm, before they reach the
 * database. Only firms of this user (by Luca id) take one; nothing is ever sent back from this route.
 */
export async function PUT(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const key = secretKey();
  if (!key) return fail("GİB girişlerini saklama bu sunucuda açık değil.", 503);
  if (!(await allow("gibSave", userId))) return fail("Çok sık gönderildi. Biraz bekleyip tekrar deneyin.", 429);
  const body = Batch.safeParse(await readJson(request));
  if (!body.success) return fail("GİB girişleri okunamadı.", 400);
  const rows = body.data.logins.flatMap((raw) => { const r = GibLoginRow.safeParse(raw); return r.success ? [r.data] : []; });
  const unique = [...new Map(rows.map((r) => [r.lucaId, r])).values()];
  const firmIds = await firmsByLucaId(userId, unique.map((r) => r.lucaId));
  const sealed = unique.flatMap((r) => {
    const firmId = firmIds.get(r.lucaId);
    return firmId ? [{ firmId, usernameSealed: seal(key, r.username, secretContext(userId, firmId, "kullanici")), passwordSealed: seal(key, r.password, secretContext(userId, firmId, "sifre")) }] : [];
  });
  try {
    await saveGibLogins(userId, sealed);
  } catch (err) {
    // A driver error carries the query's parameters (the sealed logins): only the error's name is logged.
    console.error("gib logins save failed", { error: err instanceof Error ? err.name : "unknown" });
    return fail("GİB girişleri kaydedilemedi. Tekrar deneyin.", 500);
  }
  return NextResponse.json({ saved: sealed.length, skipped: body.data.logins.length - sealed.length }, { headers: NO_STORE });
}
