import type { Metadata } from "next";
import Link from "next/link";
import { confirmLink } from "../actions";
import { isLinkType } from "../validation";
import { AuthShell } from "../LoginView";
import { SubmitButton } from "../SubmitButton";

export const metadata: Metadata = { title: "Bağlantıyı onaylayın", robots: { index: false } };
export const dynamic = "force-dynamic";

/**
 * Where the e-mail templates link to (?token_hash=…&type=…). Opening it changes nothing: a mail scanner that fetches it
 * leaves the one-time token unused. The person presses the button, and only then does confirmLink spend it.
 */
export default async function ConfirmLinkPage({ searchParams }: { searchParams: Promise<{ token_hash?: string; type?: string }> }) {
  const { token_hash: tokenHash, type } = await searchParams;
  const valid = !!tokenHash && tokenHash.length <= 512 && isLinkType(type);
  const recovery = type === "recovery";
  return (
    <AuthShell title={recovery ? "Şifre yenileme" : "E-posta doğrulama"}
      lead={valid ? (recovery ? "Yeni şifrenizi belirlemek için devam edin." : "E-posta adresinizi doğrulamak için devam edin.") : "Bu bağlantı eksik ya da bozuk."}>
      {valid ? (
        <form action={confirmLink} className="auth-fields">
          <input type="hidden" name="token_hash" value={tokenHash} />
          <input type="hidden" name="type" value={type} />
          <SubmitButton label="Devam et" pendingLabel="Doğrulanıyor…" />
        </form>
      ) : (
        <p className="alert alert-error" role="alert">Bağlantı eksik ya da bozuk. <Link href={recovery ? "/giris/sifre" : "/giris"}>{recovery ? "Yeni bir şifre bağlantısı isteyin" : "Giriş ekranına dönün"}</Link>.</p>
      )}
    </AuthShell>
  );
}
