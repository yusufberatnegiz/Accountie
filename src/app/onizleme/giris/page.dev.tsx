// Dev-only preview of the login screen (the real page needs Neon Auth env to check the session).
import { LoginView } from "@/app/giris/LoginView";

export default async function PreviewLogin({ searchParams }: { searchParams: Promise<{ mod?: string; hata?: string }> }) {
  const { mod, hata } = await searchParams;
  return <LoginView isSignup={mod === "kayit"} hata={hata} />;
}
