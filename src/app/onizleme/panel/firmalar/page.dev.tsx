// Dev-only fixture preview of the firms screen. ?tema=acik|koyu forces a theme.
import { PreviewTheme } from "../PreviewTheme";
import { PreviewApi } from "../PreviewApi";
import { AppShell } from "@/components/AppShell";
import { FirmsView } from "@/components/FirmsView";
import { PREVIEW_EMAIL, PREVIEW_FIRM, PREVIEW_FIRMS, PREVIEW_MONTH_COUNTS } from "@/lib/preview-fixtures";
import { currentMonth, isMonth, recentMonths } from "@/lib/month";

export default async function PreviewFirms({ searchParams }: { searchParams: Promise<{ tema?: string; ay?: string }> }) {
  const { tema, ay } = await searchParams;
  const now = new Date();
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="firmalar" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        <FirmsView firms={PREVIEW_FIRMS} activeId={PREVIEW_FIRM.id} month={isMonth(ay) ? ay : currentMonth(now)} months={recentMonths(now)} counts={PREVIEW_MONTH_COUNTS} base="/onizleme/panel" />
      </AppShell>
    </>
  );
}
