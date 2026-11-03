// Dev-only preview of the signup screen.
import { LoginView } from "@/app/giris/LoginView";

export default async function PreviewSignup({ searchParams }: { searchParams: Promise<{ hata?: string }> }) {
  const { hata } = await searchParams;
  return <LoginView isSignup hata={hata} />;
}
