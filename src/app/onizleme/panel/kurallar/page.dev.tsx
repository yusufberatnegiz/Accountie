// Dev-only fixture preview of the account rules screen. ?tema=acik|koyu forces a theme.
import { PreviewTheme } from "../PreviewTheme";
import { PreviewApi } from "../PreviewApi";
import { AppShell } from "@/components/AppShell";
import { RulesView } from "@/components/RulesView";
import { PREVIEW_RULE_ROWS, PREVIEW_EMAIL, PREVIEW_FIRM, PREVIEW_VENDOR_RULES } from "@/lib/preview-fixtures";

export default async function PreviewRules({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <PreviewApi approved={[]} />
      <AppShell current="kurallar" base="/onizleme/panel" email={PREVIEW_EMAIL}>
        <RulesView rows={PREVIEW_RULE_ROWS} vendorRules={PREVIEW_VENDOR_RULES} firmName={PREVIEW_FIRM.name} />
      </AppShell>
    </>
  );
}
