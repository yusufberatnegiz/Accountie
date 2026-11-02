import { listForExport, markExported } from "@/db/queries";
import { ExportSchema } from "@/lib/api-schemas";
import { getUserId } from "@/lib/auth/session";
import { fail, readJson, unauthorized } from "@/lib/http";
import { isBalanced } from "@/lib/journal";
import { buildWorkbook, chunkReceipts } from "@/lib/luca/export";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const userId = await getUserId();
  if (!userId) return unauthorized();
  const body = ExportSchema.safeParse((await readJson(request)) ?? {});
  if (!body.success) return fail("Geçersiz istek.", 400);

  // Unbalanced receipts never reach a file, even if approved earlier.
  const receipts = (await listForExport(userId, body.data.receiptIds)).filter((r) => isBalanced(r.lines));
  if (receipts.length === 0) return fail("Aktarılacak onaylı fiş yok.", 404);

  // shortcut: one file per request (Luca limit 50 fiş / 400 satır); the client asks again while X-Remaining-Receipts > 0. Upgrade to a zip if users want one download.
  const [first] = chunkReceipts(receipts);
  const file = await buildWorkbook(first);
  await markExported(userId, first.map((r) => r.id));
  const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="luca-fisler-${stamp}.xlsx"`,
      "X-Remaining-Receipts": String(receipts.length - first.length),
      "Cache-Control": "no-store",
    },
  });
}
