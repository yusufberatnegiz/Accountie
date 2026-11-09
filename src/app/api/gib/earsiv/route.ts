import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteGibCredential, getGibCredential, getRules, touchGibCredential } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { importInvoiceFiles, type Skipped } from "@/lib/efatura-import";
import { activeFirm } from "@/lib/firm";
import { download, issuedToMe, login, logout, PortalError } from "@/lib/gib/earsiv";
import { open, secretContext, secretKey, SecretError } from "@/lib/gib/secret";
import { fail, readJson, unauthorized } from "@/lib/http";
import { currentMonth } from "@/lib/month";
import { allow } from "@/lib/rate-limit";
import { unzip, ZipError } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

const Schema = z.object({ firma: z.uuid().optional(), ay: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/) });
const MAX_INVOICES = 300;
const BUDGET_MS = 40_000; // stop downloading in time to save what came; a second run skips what is already in
const ZIP_LIMITS = { maxFiles: 10, maxFileBytes: 5 * 1024 * 1024, maxTotalBytes: 10 * 1024 * 1024 };

/**
 * Pulls the month's invoices issued to the firm from the GİB e-Arşiv portal with the firm's stored login and turns them into
 * drafts like an upload. The login is opened only here, used for one portal session that is always closed, and never logged
 * or returned. A login GİB turns down is deleted at once, so a changed password is never retried into a lockout.
 */
export async function POST(request: Request) {
  const started = Date.now();
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const key = secretKey();
  if (!key) return fail("e-Arşiv bağlantısı bu sunucuda açık değil.", 503);
  const body = Schema.safeParse(await readJson(request));
  if (!body.success) return fail("Geçersiz istek.", 400);
  const { firm } = await activeFirm(userId, body.data.firma ?? null);
  if (!firm.taxNumber) return fail("Önce Firmalar'da bu firmanın VKN'sini girin; faturaların bu firmaya kesildiği VKN ile doğrulanır.", 422);
  const stored = await getGibCredential(userId, firm.id);
  if (!stored) return fail("Bu firma için e-Arşiv bağlantısı yok. Önce kullanıcı kodunu ve şifreyi kaydedin.", 404);
  if (!(await allow("gib", userId)) || !(await allow("gibFirm", firm.id))) return fail("Çok fazla deneme yapıldı. Bir süre bekleyin; GİB hesabı kilitlenmesin.", 429);

  let username: string, password: string;
  try {
    username = open(key, stored.usernameSealed, secretContext(userId, firm.id, "kullanici"));
    password = open(key, stored.passwordSealed, secretContext(userId, firm.id, "sifre"));
  } catch (e) {
    if (!(e instanceof SecretError)) throw e;
    await deleteGibCredential(userId, firm.id);
    return fail("Kayıtlı bağlantı açılamadı ve silindi. Kullanıcı kodunu ve şifreyi yeniden girin.", 409);
  }

  const month = body.data.ay;
  const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
  if (month > currentMonth(new Date())) return fail("Gelecek ay için fatura çekilemez.", 400);
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  const files: { name: string; data: Buffer }[] = [];
  const skipped: Skipped[] = [];
  let remaining = 0;

  let token: string;
  try {
    token = await login(username, password);
  } catch (e) {
    if (!(e instanceof PortalError)) throw e;
    if (e.kind === "auth") {
      await deleteGibCredential(userId, firm.id);
      return fail("GİB kayıtlı şifreyi kabul etmedi; hesap kilitlenmesin diye bağlantı silindi. Yeni şifreyi girin.", 422);
    }
    return fail(e.message, 502);
  }
  try {
    const ettns = await issuedToMe(token, `${month}-01`, last < today ? last : today);
    remaining = Math.max(0, ettns.length - MAX_INVOICES);
    for (const [i, ettn] of ettns.slice(0, MAX_INVOICES).entries()) {
      if (Date.now() - started > BUDGET_MS) { remaining += ettns.slice(0, MAX_INVOICES).length - i; break; }
      try {
        const zip = await download(token, ettn);
        files.push(...unzip(zip, ZIP_LIMITS).filter((f) => /\.xml$/i.test(f.name)).slice(0, 1).map((f) => ({ name: `${ettn}.xml`, data: f.data })));
      } catch (e) {
        if (!(e instanceof PortalError) && !(e instanceof ZipError)) throw e;
        skipped.push({ file: ettn, number: null, reason: "GİB'den indirilemedi." });
      }
    }
  } catch (e) {
    if (!(e instanceof PortalError)) throw e;
    return fail(e.message, 502);
  } finally {
    await logout(token);
  }
  await touchGibCredential(userId, firm.id);

  const { rules } = await getRules(userId);
  const result = await importInvoiceFiles(userId, firm, rules, files);
  return NextResponse.json({ firm: firm.name, created: result.ids.length, ids: result.ids, skipped: [...skipped, ...result.skipped], remaining },
    { status: result.ids.length ? 201 : 200, headers: { "Cache-Control": "no-store" } });
}
