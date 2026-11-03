// Dev-only preview of the signup screen. ?tema=acik|koyu forces a theme.
import { LoginView } from "@/app/giris/LoginView";
import { ForceTheme } from "../ForceTheme";

export default async function PreviewSignup({ searchParams }: { searchParams: Promise<{ hata?: string; tema?: string }> }) {
  const { hata, tema } = await searchParams;
  return <><ForceTheme tema={tema} /><LoginView isSignup hata={hata} /></>;
}
