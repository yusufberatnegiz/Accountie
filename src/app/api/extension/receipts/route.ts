import { NextResponse } from "next/server";
import { listForExport } from "@/db/queries";
import { extensionUserId } from "@/lib/auth/extension-token";
import { fail } from "@/lib/http";
import { approvalProblem } from "@/lib/journal";
import { lucaGridRows } from "@/lib/luca/clipboard";
import { formatTrAmount } from "@/lib/money";

export const runtime = "nodejs";

// No CORS headers: the extension popup calls this with host_permissions, web pages cannot read it.
const LIMIT = 50;

/**
 * The approved receipts the popup can write. `sirket`: the firm open in Luca (its SIRKET_ID), so the list holds that firm's receipts
 * (and those of firms not imported from Luca, which cannot be told apart), not the oldest 50 of every firm. `keep`: receipts the popup
 * wrote and waits to mark; returned while still approved, whatever the firm or the limit, so their marks are never lost.
 */
export async function GET(request: Request) {
  const userId = await extensionUserId(request);
  if (!userId) return fail("Eklenti anahtarı geçersiz veya süresi dolmuş.", 401);
  const params = new URL(request.url).searchParams;
  const sirket = params.get("sirket")?.slice(0, 20) || null;
  const keep = new Set((params.get("keep") ?? "").split(",").filter(Boolean).slice(0, 200));
  const all = (await listForExport(userId, null)).filter((r) => !approvalProblem(r.lines));
  const kept = all.filter((r) => keep.has(r.id));
  const open = all.filter((r) => !keep.has(r.id) && (!sirket || !r.firmLucaId || r.firmLucaId === sirket));
  const receipts = [...kept, ...open.slice(0, LIMIT)].map((r) => {
    const rows = lucaGridRows(r.lines, r.taxNumber);
    return {
      id: r.id,
      firm: r.firmName ?? "",
      // The firm by its id (two firms may share a name) and Luca's number for it, so the popup checks Luca has it open.
      firmId: r.firmId ?? "",
      firmLucaId: r.firmLucaId ?? "",
      title: rows[0]?.description ?? "",
      documentNo: rows[0]?.documentNo ?? "",
      documentDate: rows[0]?.documentDate ?? "",
      // What the receipt was paid: its credit lines, never the KDV a foreign invoice owes (360, sorumlu sıfatıyla) on top of it.
      total: formatTrAmount(r.lines.reduce((s, l) => s + (l.accountCode.startsWith("360") ? 0 : l.creditKurus), 0)),
      rows,
    };
  });
  return NextResponse.json({ receipts, more: open.length > LIMIT }, { headers: { "Cache-Control": "no-store" } });
}
