import type { Metadata } from "next";
import Link from "next/link";
import { inRecovery } from "@/lib/auth/session";
import { AuthShell } from "../../LoginView";
import { NewPasswordForm } from "../../ResetForms";

export const metadata: Metadata = { title: "Yeni şifre" };
export const dynamic = "force-dynamic";

/** The e-mailed link reaches here through /giris/onay (older e-mails: /auth/callback), which opened a recovery session or sent ?hata=1. */
export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  const valid = !hata && (await inRecovery());
  return (
    <AuthShell title="Yeni şifre belirleyin" lead={valid ? "En az 8 karakterlik yeni şifrenizi yazın. Sonra onunla giriş yaparsınız." : "Bu bağlantıyla şifre değiştirilemiyor."}>
      {valid ? <NewPasswordForm /> : (
        <p className="alert alert-error" role="alert">Bağlantı geçersiz ya da süresi dolmuş. <Link href="/giris/sifre">Yeni bir şifre bağlantısı isteyin</Link>.</p>
      )}
      <p className="auth-switch"><Link href="/giris">Giriş ekranına dönün</Link></p>
    </AuthShell>
  );
}
