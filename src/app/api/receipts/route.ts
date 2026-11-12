import { NextResponse } from "next/server";
import { createReceipt, getBalance, getRules, getVendorRule, hasDuplicateReceipt, listReceipts, reserveCredit, settleCredit, type NewReceipt } from "@/db/queries";
import { creditCost, creditsRequired, MIN_BALANCE } from "@/lib/credits";
import { isValidTaxNumber } from "@/lib/checks";
import { withVendorAccount } from "@/lib/vendor-rule";
import { activeFirm } from "@/lib/firm";
import { getSessionUser, getUserId } from "@/lib/auth/session";
import { extractReceipt, locateReceipts, type ExtractResult } from "@/lib/extract/extract";
import { kindOf, toForeignData, toReceiptData, toSalesData } from "@/lib/extract/schema";
import { buildForeignLines, buildSalesLines, foreignTotalTl } from "@/lib/journal-kinds";
import { tcmbRate } from "@/lib/tcmb";
import { NO_STORE, fail, unauthorized } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES, cropReceipt, isPdf, MAX_PDF_PAGES, MAX_UPLOAD_BYTES, normalizeImage, pdfPageCount, sniffImageType } from "@/lib/image";
import { allow, clientIp } from "@/lib/rate-limit";
import type { Rules } from "@/lib/default-rules";
import { buildJournalLines, warn, type JournalLine, type ReceiptData, type Warning } from "@/lib/journal";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMPTY: ReceiptData = { vendorName: null, receiptNo: null, date: null, vatLines: [], totalKurus: null, paymentMethod: "other", category: "other" };

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const userId = user.id;

  // Before any parsing: every attempt counts, so a flood of bad uploads is throttled too.
  if (!(await allow("receipt", userId)) || !(await allow("receiptIp", clientIp(request.headers)))) {
    return fail("Çok fazla fiş yüklendi. Biraz bekleyip tekrar deneyin.", 429);
  }
  // Rejected before the body is buffered; multipart overhead is allowed for.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return fail("Dosya 4 MB'tan büyük olamaz.", 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail("Fiş fotoğrafı eksik.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("Dosya 4 MB'tan büyük olamaz.", 413);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type) && file.type !== "application/pdf") return fail("Sadece JPEG, PNG, WebP, HEIC fotoğraf ya da PDF yüklenebilir.", 415);

  const bytes = Buffer.from(await file.arrayBuffer());
  // A PDF (an invoice saved from Google or Meta) goes to the reader as it is: no decoding, cropping or splitting.
  const pdf = isPdf(bytes);
  if (!pdf && !sniffImageType(bytes)) return fail("Dosya bir fotoğraf ya da PDF değil. JPEG, PNG, WebP, HEIC ya da PDF yükleyin.", 415);
  if (pdf && pdfPageCount(bytes) > MAX_PDF_PAGES) return fail(`PDF en çok ${MAX_PDF_PAGES} sayfa olabilir. Yalnız faturanın sayfalarını yükleyin.`, 413);
  let jpeg: Buffer = bytes;
  if (!pdf) {
    try {
      jpeg = await normalizeImage(bytes);
    } catch {
      return fail("Fotoğraf açılamadı. Başka bir fotoğraf deneyin; iPhone fotoğrafını (HEIC) JPEG olarak paylaşın.", 415);
    }
  }

  // Kontör: a new upload needs at least one credit; inside it the balance may go down to MIN_BALANCE (reserveCredit).
  const metered = creditsRequired();
  if (metered && (await getBalance(userId)) < 1) return NextResponse.json({ error: "Kontörünüz bitti. Fiş okumak için kontör yükleyin.", kontor: true }, { status: 402 });

  // Counted only for valid photos that are about to reach the model.
  if (!(await allow("receiptGlobal", "all"))) return fail("Fiş okuma bugün için geçici olarak durduruldu. Yarın tekrar deneyin.", 503);

  const wanted = form?.get("firma");
  const { firm } = await activeFirm(userId, typeof wanted === "string" ? wanted : null);
  const { rules } = await getRules(userId, firm.id);
  if (typeof wanted === "string" && wanted !== firm.id) return fail("Firma bulunamadı.", 404); // never another firm's data
  if (pdf) {
    const one = await readMetered(metered, userId, firm.id, jpeg, rules, "application/pdf");
    if (one === "no_credit") return NextResponse.json({ error: "Kontörünüz bitti. Fiş okumak için kontör yükleyin.", kontor: true }, { status: 402 });
    if (!one) return fail("Fiş kaydedilemedi. Tekrar deneyin.", 500);
    return NextResponse.json({ id: one.id, ids: [one.id], readable: one.readable }, { status: 201 });
  }
  // Several receipts laid side by side in one photo: each is cut from the full-size upload and read on its own.
  const boxes = await locateReceipts(jpeg).catch(() => []);
  let images = [jpeg];
  if (boxes.length > 1) {
    images = [];
    for (const box of boxes) {
      // The photo was counted once above; every further receipt is one more read against the same limits.
      if (images.length && (!(await allow("receipt", userId)) || !(await allow("receiptGlobal", "all")))) break;
      // A crop that fails (an odd box) is skipped; if none worked the photo is read whole.
      const crop = await cropReceipt(bytes, box).catch(() => null);
      if (crop) images.push(crop);
    }
  }
  if (images.length === 0) images = [jpeg];
  const results = await Promise.all(images.map((image) => readMetered(metered, userId, firm.id, image, rules)));
  // Receipts left unread because the balance reached its floor: said once, the rest of the photo is not lost silently.
  const skipped = results.filter((r) => r === "no_credit").length;
  const saved = results.filter((r) => r !== "no_credit");
  const ids = saved.flatMap((r) => (r ? [r.id] : []));
  if (ids.length === 0 && skipped) return NextResponse.json({ error: "Kontörünüz bitti. Fiş okumak için kontör yükleyin.", kontor: true }, { status: 402 });
  if (ids.length === 0) return fail("Fiş kaydedilemedi. Tekrar deneyin.", 500);
  return NextResponse.json({ id: ids[0], ids, readable: saved.every((r) => r?.readable), skipped }, { status: 201 });
}

type Saved = { id: string; readable: boolean; kind: string } | null;

/**
 * One document read against the balance: 1 credit is taken before the read (none left above the floor: "no_credit", the model
 * is not called), then settled to its real cost (an invoice 2, an unread or unsaved document 0) and tied to the receipt.
 */
async function readMetered(metered: boolean, userId: string, firmId: string, image: Buffer, rules: Rules, mediaType?: "image/jpeg" | "application/pdf"): Promise<Saved | "no_credit"> {
  const entry = metered ? await reserveCredit(userId, firmId, MIN_BALANCE) : null;
  if (metered && !entry) return "no_credit";
  let saved: Saved = null;
  try {
    saved = await readAndSave(userId, firmId, image, rules, mediaType);
  } finally {
    // Also when the read throws: the reserved credit is given back, never kept for a document that was not read.
    if (entry) {
      const cost = saved ? creditCost({ ok: saved.readable, kind: saved.kind }) : 0;
      const settle = () => settleCredit(userId, entry, cost, saved?.id ?? null, MIN_BALANCE);
      await settle().catch(settle).catch((err) => console.error("credit settle failed", { error: err instanceof Error ? err.name : "unknown" }));
    }
  }
  return saved;
}

async function readAndSave(userId: string, firmId: string, jpeg: Buffer, rules: Rules, mediaType: "image/jpeg" | "application/pdf" = "image/jpeg"): Promise<Saved> {
  let result: ExtractResult;
  try {
    result = await extractReceipt(jpeg, undefined, mediaType);
  } catch (err) {
    console.error("receipt extraction crashed", { error: err instanceof Error ? err.name : "unknown" });
    result = { ok: false, inputTokens: 0, outputTokens: 0 };
  }
  const kind = result.ok ? kindOf(result.extraction) : "receipt";
  if (result.ok && kind !== "receipt" && kind !== "domestic_invoice") return saveOther(userId, firmId, result, rules);

  const data = result.ok ? toReceiptData(result.extraction) : EMPTY;
  const taxNumber = result.ok ? result.extraction.taxNumber : null;
  // A seller this firm has corrected before gets its learned expense account (src/lib/vendor-rule.ts); a failed lookup falls back.
  const learned = taxNumber && isValidTaxNumber(taxNumber) ? await getVendorRule(userId, firmId, taxNumber).catch(() => null) : null;
  const { lines, warnings } = buildJournalLines(data, { ...withVendorAccount(rules, data.category, learned && { code: learned.accountCode, name: learned.accountName }), ...(kind === "domestic_invoice" && { documentType: rules.foreign.documentType }) });
  const extra = result.ok ? result.problems : ["extraction_failed"];
  const allWarnings: Warning[] = [...warnings, ...extra.filter((c) => !warnings.some((w) => w.code === c)).map(warn)];
  // Warn only, never block: the user decides. A failed lookup must not lose the upload.
  if (taxNumber && data.receiptNo && data.date && (await hasDuplicateReceipt(userId, taxNumber, data.receiptNo, data.date).catch(() => false))) {
    allWarnings.unshift(warn("duplicate"));
  }

  const receipt: NewReceipt = {
    vendorName: data.vendorName,
    taxNumber,
    receiptNo: data.receiptNo,
    receiptDate: data.date,
    totalKurus: data.totalKurus,
    paymentMethod: data.paymentMethod,
    category: data.category,
    extraction: result.ok ? { ...result.extraction, fallback: result.fallback } : null,
    warnings: allWarnings,
    model: result.ok ? result.model : null,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
  let id: string;
  try {
    id = await createReceipt(userId, firmId, receipt, lines);
  } catch (err) {
    console.error("receipt save failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  }
  return { id, readable: result.ok, kind };
}

/** A Z report or a foreign service invoice: its own lines (src/lib/journal-kinds.ts), no seller learning, the TL rate kept with the read. */
async function saveOther(userId: string, firmId: string, result: Extract<ExtractResult, { ok: true }>, rules: Rules): Promise<Saved> {
  const x = result.extraction;
  const extra = result.problems.map(warn);
  const meta = { model: result.model, inputTokens: result.inputTokens, outputTokens: result.outputTokens };
  let receipt: NewReceipt;
  let built: { lines: JournalLine[]; warnings: Warning[] };
  if (kindOf(x) === "z_report") {
    const data = toSalesData(x);
    built = buildSalesLines(data, rules);
    // The VKN on a Z report is the firm's own: kept to find the same report uploaded twice, never to learn a seller.
    const taxNumber = x.taxNumber && isValidTaxNumber(x.taxNumber) ? x.taxNumber : null;
    if (taxNumber && data.zNo && data.date && (await hasDuplicateReceipt(userId, taxNumber, data.zNo, data.date).catch(() => false))) extra.unshift(warn("duplicate"));
    receipt = { vendorName: data.vendorName, taxNumber, receiptNo: data.zNo, receiptDate: data.date, totalKurus: data.totalKurus, paymentMethod: "other", category: "z_report", extraction: { ...x, fallback: result.fallback }, warnings: [], ...meta };
  } else {
    const data = toForeignData(x);
    const fx = data.currency !== "TRY" && data.date ? await tcmbRate(data.currency, data.date).catch(() => null) : null;
    built = buildForeignLines(data, rules, fx);
    receipt = { vendorName: data.vendorName, taxNumber: null, receiptNo: data.invoiceNo, receiptDate: data.date, totalKurus: foreignTotalTl(data, fx), paymentMethod: data.paymentMethod, category: "foreign", extraction: { ...x, fx, fallback: result.fallback }, warnings: [], ...meta };
  }
  receipt.warnings = [...built.warnings, ...extra.filter((w) => !built.warnings.some((b) => b.code === w.code))];
  try {
    return { id: await createReceipt(userId, firmId, receipt, built.lines), readable: true, kind: kindOf(x) };
  } catch (err) {
    console.error("receipt save failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  }
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const status = new URL(request.url).searchParams.get("status");
  if (status !== null && status !== "draft" && status !== "approved" && status !== "exported") return fail("Geçersiz durum.", 400);
  const { firm } = await activeFirm(userId);
  return NextResponse.json({ receipts: await listReceipts(userId, firm.id, { status: status ?? undefined }) }, { headers: NO_STORE });
}
