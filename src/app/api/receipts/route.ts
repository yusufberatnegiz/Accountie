import { NextResponse } from "next/server";
import { createReceipt, getRules, listReceipts, type NewReceipt } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { extractReceipt, type ExtractResult } from "@/lib/extract/extract";
import { toReceiptData } from "@/lib/extract/schema";
import { fail, unauthorized } from "@/lib/http";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, normalizeImage, sniffImageType } from "@/lib/image";
import { allow } from "@/lib/rate-limit";
import { buildJournalLines, warn, type ReceiptData, type Warning } from "@/lib/journal";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMPTY: ReceiptData = { vendorName: null, receiptNo: null, date: null, vatLines: [], totalKurus: null, paymentMethod: "other", category: "other" };

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();

  // Before any parsing: every attempt counts, so a flood of bad uploads is throttled too.
  if (!(await allow("receipt", userId))) {
    return fail("Çok fazla fiş yüklendi. Biraz bekleyip tekrar deneyin.", 429);
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return fail("Fiş fotoğrafı eksik.", 400);
  if (file.size > MAX_UPLOAD_BYTES) return fail("Fotoğraf 10 MB'tan büyük olamaz.", 413);
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return fail("Sadece JPEG, PNG, WebP veya HEIC fotoğraf yüklenebilir.", 415);

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!sniffImageType(bytes)) return fail("Dosya bir fotoğraf değil. JPEG, PNG, WebP veya HEIC yükleyin.", 415);
  let jpeg: Buffer;
  try {
    jpeg = await normalizeImage(bytes);
  } catch {
    return fail("Fotoğraf açılamadı. Başka bir fotoğraf deneyin.", 415);
  }

  const { rules } = await getRules(userId);
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

  const receipt: NewReceipt = {
    vendorName: data.vendorName,
    taxNumber: result.ok ? result.extraction.taxNumber : null,
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
  const id = await createReceipt(userId, receipt, lines);
  return NextResponse.json({ id, readable: result.ok }, { status: 201 });
}

export async function GET(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const status = new URL(request.url).searchParams.get("status");
  if (status !== null && status !== "draft" && status !== "approved" && status !== "exported") return fail("Geçersiz durum.", 400);
  return NextResponse.json({ receipts: await listReceipts(userId, status ?? undefined) });
}
