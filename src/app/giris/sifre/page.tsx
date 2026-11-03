import type { Metadata } from "next";
import Link from "next/link";
import { turnstileSiteKey } from "@/lib/turnstile";
import { AuthShell } from "../LoginView";
import { RequestResetForm } from "../ResetForms";

export const metadata: Metadata = { title: "Şifre yenileme" };
export const dynamic = "force-dynamic";

/** Public, no session needed. Neon Auth e-mails a link that returns to /giris/sifre/yeni. */
export default function ResetRequestPage() {
  return (
    <AuthShell title="Şifrenizi yenileyin" lead="Hesabınızın e-postasını yazın. Yeni şifre için bir bağlantı gönderilir.">
      <RequestResetForm turnstileSiteKey={turnstileSiteKey()} />
      <p className="auth-switch">Şifrenizi hatırladınız mı? <Link href="/giris">Giriş yapın</Link></p>
    </AuthShell>
  );
}
