import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "../../LoginView";
import { NewPasswordForm } from "../../ResetForms";

export const metadata: Metadata = { title: "Yeni şifre" };
export const dynamic = "force-dynamic";

/** The e-mailed link lands here with ?token= (or ?error= when Neon Auth already rejected the link). */
export default async function NewPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string; error?: string }> }) {
  const { token, error } = await searchParams;
  const valid = typeof token === "string" && token.length > 0 && token.length <= 512 && !error;
  return (
    <AuthShell title="Yeni şifre belirleyin" lead={valid ? "En az 8 karakterlik yeni şifrenizi yazın. Sonra onunla giriş yaparsınız." : "Bu bağlantıyla şifre değiştirilemiyor."}>
      {valid ? <NewPasswordForm token={token} /> : (
        <p className="alert alert-error" role="alert">Bağlantı geçersiz ya da süresi dolmuş. <Link href="/giris/sifre">Yeni bir şifre bağlantısı isteyin</Link>.</p>
      )}
      <p className="auth-switch"><Link href="/giris">Giriş ekranına dönün</Link></p>
    </AuthShell>
  );
}
