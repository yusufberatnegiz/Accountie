import { NextResponse } from "next/server";
import { createReceipt, getRules, hasDuplicateReceipt, listReceipts, type NewReceipt } from "@/db/queries";
import { getSessionUser, getUserId } from "@/lib/auth/session";
import { extractReceipt, locateReceipts, type ExtractResult } from "@/lib/extract/extract";
import { toReceiptData } from "@/lib/extract/schema";
import { fail, unauthorized } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES, cropReceipt, MAX_UPLOAD_BYTES, normalizeImage, sniffImageType } from "@/lib/image";
import { allow, clientIp } from "@/lib/rate-limit";
import type { Rules } from "@/lib/default-rules";
import { buildJournalLines, warn, type ReceiptData, type Warning } from "@/lib/journal";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMPTY: ReceiptData = { vendorName: null, receiptNo: null, date: null, vatLines: [], totalKurus: null, paymentMethod: "other", category: "other" };

const DAY_MS = 24 * 60 * 60_000;

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return unauthorized();
  const userId = user.id;

  // Before any parsing: every attempt counts, so a flood of bad uploads is throttled too.
  const isNew = !(Date.now() - user.createdAt.getTime() >= DAY_MS); // unknown sign-up time counts as new
  if (!(await allow(isNew ? "receiptNew" : "receipt", userId)) || !(await allow("receiptIp", clientIp(request.headers)))) {
    return fail("Çok fazla fiş yüklendi. Biraz bekleyip tekrar deneyin.", 429);
  }
  // Rejected before the body is buffered; multipart overhead is allowed for.
  if (Number(request.headers.get("content-length") ?? 0) > MAX_UPLOAD_BYTES + 64 * 1024) return fail("Fotoğraf 4 MB'tan büyük olamaz.", 413);

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail("Fiş fotoğrafı eksik.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("Fotoğraf 4 MB'tan büyük olamaz.", 413);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail("Sadece JPEG, PNG, WebP veya HEIC fotoğraf yüklenebilir.", 415);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(bytes)) return fail("Dosya bir fotoğraf değil. JPEG, PNG, WebP veya HEIC yükleyin.", 415);
  let jpeg: Buffer;
  try {
    jpeg = await normalizeImage(bytes);
  } catch {
    return fail("Fotoğraf açılamadı. Başka bir fotoğraf deneyin; iPhone fotoğrafını (HEIC) JPEG olarak paylaşın.", 415);
  }

  // Counted only for valid photos that are about to reach the model.
  if (!(await allow("receiptGlobal", "all"))) return fail("Fiş okuma bugün için geçici olarak durduruldu. Yarın tekrar deneyin.", 503);

  const { rules } = await getRules(userId);
  // Several receipts laid side by side in one photo: each is cut from the full-size upload and read on its own.
  const boxes = await locateReceipts(jpeg).catch(() => []);
  let images = [jpeg];
  if (boxes.length > 1) {
    images = [];
    for (const box of boxes) {
      // The photo was counted once above; every further receipt is one more read against the same limits.
      if (images.length && (!(await allow(isNew ? "receiptNew" : "receipt", userId)) || !(await allow("receiptGlobal", "all")))) break;
      // A crop that fails (an odd box) is skipped; if none worked the photo is read whole.
      const crop = await cropReceipt(bytes, box).catch(() => null);
      if (crop) images.push(crop);
    }
  }
  if (images.length === 0) images = [jpeg];
  const saved = await Promise.all(images.map((image) => readAndSave(userId, image, rules)));
  const ids = saved.flatMap((r) => (r ? [r.id] : []));
  if (ids.length === 0) return fail("Fiş kaydedilemedi. Tekrar deneyin.", 500);
  return NextResponse.json({ id: ids[0], ids, readable: saved.every((r) => r?.readable) }, { status: 201 });
}

async function readAndSave(userId: string, jpeg: Buffer, rules: Rules): Promise<{ id: string; readable: boolean } | null> {
  let result: ExtractResult;
  try {
    result = await extractReceipt(jpeg);
  } catch (err) {
    console.error("receipt extraction crashed", { error: err instanceof Error ? err.name : "unknown" });
    result = { ok: false, inputTokens: 0, outputTokens: 0 };
  }

  const data = result.ok ? toReceiptData(result.extraction) : EMPTY;
  const { lines, warnings } = buildJournalLines(data, rules);
  const extra = result.ok ? result.problems : ["extraction_failed"];
  const allWarnings: Warning[] = [...warnings, ...extra.filter((c) => !warnings.some((w) => w.code === c)).map(warn)];
  const taxNumber = result.ok ? result.extraction.taxNumber : null;
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
    extraction: result.ok ? result.extraction : null,
    warnings: allWarnings,
    model: result.ok ? result.model : null,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
  };
  let id: string;
  try {
    id = await createReceipt(userId, receipt, lines);
  } catch (err) {
    console.error("receipt save failed", { error: err instanceof Error ? err.name : "unknown" });
    return null;
  }
  return { id, readable: result.ok };
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const status = new URL(request.url).searchParams.get("status");
  if (status !== null && status !== "draft" && status !== "approved" && status !== "exported") return fail("Geçersiz durum.", 400);
  return NextResponse.json({ receipts: await listReceipts(userId, status ?? undefined) });
}
