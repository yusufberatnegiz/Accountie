// Dev-only fixture preview of the firms screen. ?tema=acik|koyu forces a theme.
import { PreviewTheme } from "../PreviewTheme";
import { PreviewApi } from "../PreviewApi";
import { AppShell } from "@/components/AppShell";
import { FirmsView } from "@/components/FirmsView";
import { PREVIEW_EMAIL, PREVIEW_FIRM, PREVIEW_FIRMS } from "@/lib/preview-fixtures";

export default async function PreviewFirms({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="firmalar" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        <FirmsView firms={PREVIEW_FIRMS} activeId={PREVIEW_FIRM.id} base="/onizleme/panel" />
      </AppShell>
    </>
  );
}
