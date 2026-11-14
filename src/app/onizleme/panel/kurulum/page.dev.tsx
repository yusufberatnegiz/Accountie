// Dev-only preview of the setup wizard; demo answers every check (no extension, no server). ?adim=1..4 opens a step.
import { PreviewTheme } from "../PreviewTheme";
import { AppShell } from "@/components/AppShell";
import { SetupWizard } from "@/components/SetupWizard";
import { PREVIEW_EMAIL } from "@/lib/preview-fixtures";

export default async function PreviewSetup({ searchParams }: { searchParams: Promise<{ tema?: string; adim?: string }> }) {
  const { tema, adim } = await searchParams;
  const step = (["1", "2", "3", "4"].includes(adim ?? "") ? Number(adim) : 1) as 1 | 2 | 3 | 4;
  return (
    <>
      <PreviewTheme tema={tema} />
      <AppShell current="kurulum" base="/onizleme/panel" email={PREVIEW_EMAIL} setup>
        <SetupWizard initialStep={step} initialFirms={step === 4 ? 12 : 0} base="/onizleme/panel" demo />
      </AppShell>
    </>
  );
}
