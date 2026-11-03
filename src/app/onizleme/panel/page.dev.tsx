// Dev-only fixture preview of the receipt list (built only by `next dev`, see next.config.ts pageExtensions).
// ?durum= tab, ?bos=1 empty account, ?yukleniyor=1 the loading state, ?tema=acik|koyu forced theme.
import { AppShell } from "@/components/AppShell";
import { PanelLoading } from "@/components/PanelLoading";
import { ReceiptListView, TABS } from "@/components/ReceiptListView";
import { PREVIEW_LIST, previewThemeScript, PREVIEW_EMAIL } from "@/lib/preview-fixtures";

export default async function PreviewList({ searchParams }: { searchParams: Promise<{ durum?: string; bos?: string; yukleniyor?: string; tema?: string }> }) {
  const { durum = "", bos, yukleniyor, tema } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: previewThemeScript(tema) }} />
      <AppShell current="fisler" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        {yukleniyor ? <PanelLoading /> : <ReceiptListView receipts={bos ? [] : PREVIEW_LIST} tab={tab} base="/onizleme/panel" />}
      </AppShell>
    </>
  );
}
