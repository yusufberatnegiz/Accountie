// Dev-only fixture preview of the receipt list (built only by `next dev`, see next.config.ts pageExtensions).
import { AppHeader } from "@/components/AppHeader";
import { HomeView, TABS } from "@/components/HomeView";
import { PREVIEW_RECEIPTS } from "@/lib/preview-fixtures";

export default async function PreviewHome({ searchParams }: { searchParams: Promise<{ durum?: string; bos?: string }> }) {
  const { durum = "", bos } = await searchParams;
  const tab = TABS.find((t) => t.slug === durum) ?? TABS[0];
  const receipts = bos ? [] : PREVIEW_RECEIPTS.filter((r) => !tab.status || r.status === tab.status);
  return (
    <>
      <AppHeader current="fisler" />
      <HomeView receipts={receipts} tab={tab} base="/onizleme" />
    </>
  );
}
