import { NextResponse } from "next/server";
import { createReceipt, getRules, getVendorRule, hasDuplicateReceipt, type NewReceipt } from "@/db/queries";
import { getUserId } from "@/lib/auth/session";
import { isValidTaxNumber } from "@/lib/checks";
import { InvoiceError, invoiceData, invoiceRules, parseInvoice, skipReason } from "@/lib/efatura";
import { activeFirm } from "@/lib/firm";
import { fail, unauthorized } from "@/lib/http";
import { buildJournalLines, warn } from "@/lib/journal";
import { allow } from "@/lib/rate-limit";
import { withVendorAccount } from "@/lib/vendor-rule";
import { unzip, ZipError } from "@/lib/zip";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_BYTES = 4 * 1024 * 1024; // under Vercel's 4.5 MB request body limit
const MAX_INVOICES = 300;
const ZIP_LIMITS = { maxFiles: 1000, maxFileBytes: 5 * 1024 * 1024, maxTotalBytes: 100 * 1024 * 1024 };

type Skipped = { file: string; number: string | null; reason: string };

/**
 * Turns e-Fatura / e-Arşiv XML the user downloaded (one .xml, or the GİB portal's / integrator's .zip) into draft receipts of
 * the chosen firm. Nothing reaches GİB from here: no credentials, no session, no scraping. The upload is untrusted: the zip
 * is inflated with hard caps, each XML is parsed without DTDs or entities, and only plain TRY purchase invoices addressed
 * to the firm become drafts; the rest are listed with the reason. The file itself is not stored.
 */
export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  if (!(await allow("efatura", userId))) return fail("Çok fazla yükleme yapıldı. Biraz bekleyip tekrar deneyin.", 429);
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES + 64 * 1024) return fail("Dosya 4 MB'tan büyük olamaz.", 413);
  const form = await request.formData().catch(() => null);
  const file = form?.get("dosya");
  if (!(file instanceof File)) return fail("e-Fatura dosyası eksik.", 400);
  if (file.size > MAX_BYTES) return fail("Dosya 4 MB'tan büyük olamaz.", 413);
  const bytes = Buffer.from(await file.arrayBuffer());

  let files: { name: string; data: Buffer }[];
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) {
    try {
      files = unzip(bytes, ZIP_LIMITS).filter((f) => /\.xml$/i.test(f.name));
    } catch (e) {
      if (e instanceof ZipError) return fail("Zip açılamadı ya da çok büyük. GİB'den indirdiğiniz zip'i olduğu gibi yükleyin.", 422);
      throw e;
    }
  } else if (/^(﻿)?\s*</.test(bytes.subarray(0, 64).toString("utf8"))) {
    files = [{ name: file.name, data: bytes }];
  } else {
    return fail("Dosya XML ya da zip değil. e-Faturayı XML (veya zip) olarak indirin.", 415);
  }
  if (files.length === 0) return fail("Dosyada e-Fatura XML'i yok.", 422);
  if (files.length > MAX_INVOICES) return fail(`Bir seferde en fazla ${MAX_INVOICES} fatura yüklenebilir.`, 413);

  const wanted = form?.get("firma");
  const [{ rules }, { firm }] = await Promise.all([getRules(userId), activeFirm(userId, typeof wanted === "string" ? wanted : null)]);
  const ids: string[] = [];
  const skipped: Skipped[] = [];
  const seen = new Set<string>();
  const name = (f: { name: string }) => f.name.split(/[\\/]/).pop()!.slice(0, 120);

  for (const f of files) {
    let inv;
    try {
      inv = parseInvoice(f.data.toString("utf8"));
    } catch (e) {
      if (!(e instanceof InvoiceError)) throw e;
      skipped.push({ file: name(f), number: null, reason: e.message });
      continue;
    }
    const reason = skipReason(inv, firm.taxNumber);
    if (reason) { skipped.push({ file: name(f), number: inv.number, reason }); continue; }
    const vkn = inv.supplier.taxNumber && isValidTaxNumber(inv.supplier.taxNumber) ? inv.supplier.taxNumber : null;
    const key = `${vkn}|${inv.number}|${inv.date}`;
    if (seen.has(key) || (vkn && (await hasDuplicateReceipt(userId, vkn, inv.number, inv.date)))) {
      skipped.push({ file: name(f), number: inv.number, reason: "Bu fatura zaten yüklü." });
      continue;
    }
    seen.add(key);

    const data = invoiceData(inv);
    const learned = vkn ? await getVendorRule(userId, firm.id, vkn).catch(() => null) : null;
    const { lines, warnings } = buildJournalLines(data, withVendorAccount(invoiceRules(rules), data.category, learned && { code: learned.accountCode, name: learned.accountName }));
    const extra = [warn("efatura"), ...(firm.taxNumber ? [] : [warn("efatura_unverified")]), ...(inv.otherTax ? [warn("efatura_other_tax")] : []), ...(vkn ? [] : [warn("tax_number_invalid")])];
    const receipt: NewReceipt = {
      vendorName: data.vendorName,
      taxNumber: vkn,
      receiptNo: data.receiptNo,
      receiptDate: data.date,
      totalKurus: data.totalKurus,
      paymentMethod: data.paymentMethod,
      category: data.category,
      extraction: { source: "e-fatura", ...inv },
      warnings: [...extra, ...warnings.filter((w) => !extra.some((x) => x.code === w.code))],
      model: "e-fatura",
      inputTokens: 0,
      outputTokens: 0,
    };
    ids.push(await createReceipt(userId, firm.id, receipt, lines));
  }
  return NextResponse.json({ firm: firm.name, created: ids.length, ids, skipped }, { status: ids.length ? 201 : 200, headers: { "Cache-Control": "no-store" } });
}
