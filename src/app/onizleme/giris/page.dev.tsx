// Dev-only preview of the login screen (the real page needs Neon Auth env to check the session). ?tema=acik|koyu forces a theme.
import { LoginView } from "@/app/giris/LoginView";
import { ForceTheme } from "../ForceTheme";

export default async function PreviewLogin({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string; tema?: string }> }) {
  const { hata, mesaj, tema } = await searchParams;
  return <><ForceTheme tema={tema} /><LoginView isSignup={false} hata={hata} mesaj={mesaj} /></>;
}
