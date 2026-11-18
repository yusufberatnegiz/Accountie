// Dev-only fixture preview of the receipt list (built only by `next dev`, see next.config.ts pageExtensions).
// ?durum= tab, ?fis=<id> a receipt opened under its row, ?bos=1 empty account, ?yukleniyor=1 the loading state, ?tema=acik|koyu forced theme, ?sifirla=1 resets played statuses.
import { cookies } from "next/headers";
import { PreviewTheme } from "./PreviewTheme";
import { PreviewApi } from "./PreviewApi";
import { PREVIEW_COOKIE, withStatuses } from "./preview-state";
import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";
import { ReceiptListView, TABS, openHref, listHref, nextInList } from "@/components/ReceiptListView";
import { ReceiptView } from "@/components/ReceiptView";
import { DEFAULT_PLAN, DEFAULT_RULES } from "@/lib/default-rules";
import { leavesOf } from "@/lib/plan-suggest";
import { PREVIEW_LIST, PREVIEW_EMAIL, PREVIEW_FIRM, PREVIEW_RECEIPTS } from "@/lib/preview-fixtures";
import { isMonth, recentMonths } from "@/lib/month";

export default async function PreviewList({ searchParams }: { searchParams: Promise<{ durum?: string; bos?: string; yukleniyor?: string; tema?: string; ay?: string; fis?: string }> }) {
  const { durum = "", bos, yukleniyor, tema, ay, fis } = await searchParams;
  const month = isMonth(ay) ? ay : "";
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  const played = (await cookies()).get(PREVIEW_COOKIE)?.value;
  const list = withStatuses(PREVIEW_LIST, played)
    .filter((r) => !month || (r.receiptDate ?? r.createdAt.toISOString()).slice(0, 7) === month);
  // A receipt opened under its row as the list page opens it (src/app/panel/(liste)/page.tsx), from the review screen's fixtures.
  const all = withStatuses(PREVIEW_RECEIPTS, played);
  const receipt = all.find((r) => r.id === fis);
  const base = "/onizleme/panel";
  const close = listHref(base, tab.slug, month);
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={list.filter((r) => r.status === "approved").map((r) => r.id)} />
      <AppShell current="fisler" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        {yukleniyor ? <PanelLoading /> : <ReceiptListView receipts={bos ? [] : list} tab={tab} firm={PREVIEW_FIRM} month={month} months={recentMonths(new Date("2026-09-15"))} base={base}
          opened={receipt ? { id: receipt.id, detail: <ReceiptView receipt={receipt} rules={DEFAULT_RULES} next={nextInList(list, tab, receipt.id)} base={base} plan={[...DEFAULT_PLAN]}
            postable={leavesOf(DEFAULT_PLAN).map(({ code, name }) => ({ code, name }))} inList={{ list: close, open: openHref(base, tab.slug, month) }} /> } : undefined} />}
      </AppShell>
    </>
  );
}
