import { NextResponse } from "next/server";
import { listForExport } from "@/db/queries";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { lucaGridRows } from "@/lib/luca/clipboard";
import { formatTrAmount } from "@/lib/money";

export const runtime = "nodejs";

// No CORS headers: the extension popup calls this with host_permissions, web pages cannot read it.
export async function GET(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const receipts = (await listForExport(userId)).filter((r) => !approvalProblem(r.lines)).slice(0, 50).map((r) => {
    const rows = lucaGridRows(r.lines);
    return {
      id: r.id,
      title: rows[0]?.description ?? "",
      documentNo: rows[0]?.documentNo ?? "",
      documentDate: rows[0]?.documentDate ?? "",
      total: formatTrAmount(r.lines.reduce((s, l) => s + l.creditKurus, 0)),
      rows,
    };
  });
  return NextResponse.json({ receipts }, { headers: { "Cache-Control": "no-store" } });
}
