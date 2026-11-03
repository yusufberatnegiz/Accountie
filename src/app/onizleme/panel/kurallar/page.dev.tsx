// Dev-only fixture preview of the account rules screen. ?tema=acik|koyu forces a theme.
import { AppShell } from "@/components/AppShell";
import { RulesView } from "@/components/RulesView";
import { PREVIEW_RULE_ROWS, previewThemeScript } from "@/lib/preview-fixtures";

export default async function PreviewRules({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: previewThemeScript(tema) }} />
      <AppShell current="kurallar" base="/onizleme/panel">
        <RulesView rows={PREVIEW_RULE_ROWS} />
      </AppShell>
    </>
  );
}
