// Dev-only preview of the muavin check with a fixed result (no upload). ?tema=acik|koyu forces a theme; ?bos=1 before an upload.
import { PreviewTheme } from "../PreviewTheme";
import { PreviewApi } from "../PreviewApi";
import { AppShell } from "@/components/AppShell";
import { ReconcileView } from "@/components/ReconcileView";
import { reconcile } from "@/lib/luca/muavin";
import { isMonth, recentMonths } from "@/lib/month";
import { PREVIEW_EMAIL, PREVIEW_FIRM, PREVIEW_RECEIPTS } from "@/lib/preview-fixtures";

export default async function PreviewReconcile({ searchParams }: { searchParams: Promise<{ tema?: string; bos?: string; ay?: string }> }) {
  const { tema, bos, ay } = await searchParams;
  const month = isMonth(ay) ? ay : "2026-09";
  const sent = PREVIEW_RECEIPTS.slice(0, 4).map((r) => ({ id: r.id, vendorName: r.vendorName, documentNo: r.receiptNo ?? "", lines: r.lines }));
  // A muavin of 191 lines: the first matches, the second's VAT differs, the third is missing, plus one row Luca has on its own.
  const rows = sent.flatMap((r, i) => r.lines.filter((l) => l.accountCode.startsWith("191")).map((l) => ({
    accountCode: l.accountCode, documentNo: r.documentNo, date: "2026-09-02", debitKurus: i === 1 ? l.debitKurus + 800 : l.debitKurus, creditKurus: 0,
  }))).filter((_, i) => i !== 2).concat({ accountCode: "191.03.20", documentNo: "7777", date: "2026-09-12", debitKurus: 1500, creditKurus: 0 });
  const result = { ...reconcile(sent, rows), rowCount: rows.length };
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="fisler" base="/onizleme/panel" email={PREVIEW_EMAIL} firmId={PREVIEW_FIRM.id}>
        <ReconcileView firmName={PREVIEW_FIRM.name} month={month} months={recentMonths(new Date("2026-09-15"))} base="/onizleme/panel" preview={bos || month !== "2026-09" ? undefined : result} />
      </AppShell>
    </>
  );
}
