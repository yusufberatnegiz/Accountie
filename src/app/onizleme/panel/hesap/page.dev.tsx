// Dev-only preview of Hesabı sil (the form posts to the real action, which sends a visitor without a session to /giris).
import { PreviewTheme } from "../PreviewTheme";
import { AppShell } from "@/components/AppShell";
import { DeleteAccountView } from "@/components/DeleteAccountForm";
import { PREVIEW_EMAIL } from "@/lib/preview-fixtures";

export default async function PreviewDeleteAccount({ searchParams }: { searchParams: Promise<{ tema?: string }> }) {
  const { tema } = await searchParams;
  return (
    <>
      <PreviewTheme tema={tema} />
      <AppShell current="hesap" base="/onizleme/panel" email={PREVIEW_EMAIL}><DeleteAccountView /></AppShell>
    </>
  );
}
