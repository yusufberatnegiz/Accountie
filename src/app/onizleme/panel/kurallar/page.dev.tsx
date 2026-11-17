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
        {/* Two departments a Z report showed, as Kurallar lists them (src/app/panel/kurallar/page.tsx). */}
        <RulesView rows={[...PREVIEW_RULE_ROWS, { kind: "sales", key: "dept:20:ALKOLLÜ İÇECE", label: "ALKOLLÜ İÇECE (%20)", accountCode: "600.20.03", accountName: "% 20 Alkollü İçki Satışları" }, { kind: "sales", key: "dept:0:TEKEL", label: "TEKEL (%0)", accountCode: "600.00.01", accountName: "Tekel Satışları" }]} vendorRules={PREVIEW_VENDOR_RULES} firmName={PREVIEW_FIRM.name} />
      </AppShell>
    </>
  );
}
