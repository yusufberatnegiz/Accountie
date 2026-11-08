// Dev-only fixture preview of the receipt list (built only by `next dev`, see next.config.ts pageExtensions).
// ?durum= tab, ?bos=1 empty account, ?yukleniyor=1 the loading state, ?tema=acik|koyu forced theme, ?sifirla=1 resets played statuses.
import { cookies } from "next/headers";
import { PreviewTheme } from "./PreviewTheme";
import { PreviewApi } from "./PreviewApi";
import { PREVIEW_COOKIE, withStatuses } from "./preview-state";
import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";
import { ReceiptListView, TABS } from "@/components/ReceiptListView";
import { PREVIEW_LIST, PREVIEW_EMAIL, PREVIEW_FIRM } from "@/lib/preview-fixtures";
import { isMonth, recentMonths } from "@/lib/month";

export default async function PreviewList({ searchParams }: { searchParams: Promise<{ durum?: string; bos?: string; yukleniyor?: string; tema?: string; ay?: string }> }) {
  const { durum = "", bos, yukleniyor, tema, ay } = await searchParams;
  const month = isMonth(ay) ? ay : "";
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  const list = withStatuses(PREVIEW_LIST, (await cookies()).get(PREVIEW_COOKIE)?.value)
    .filter((r) => !month || (r.receiptDate ?? r.createdAt.toISOString()).slice(0, 7) === month);
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={list.filter((r) => r.status === "approved").map((r) => r.id)} />
      <AppShell current="fisler" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        {yukleniyor ? <PanelLoading /> : <ReceiptListView receipts={bos ? [] : list} tab={tab} firm={PREVIEW_FIRM} month={month} months={recentMonths(new Date("2026-09-15"))} base="/onizleme/panel" />}
      </AppShell>
    </>
  );
}
