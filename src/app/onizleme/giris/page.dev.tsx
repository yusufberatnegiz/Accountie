// Dev-only preview of the login screen (the real page needs Neon Auth env to check the session).
import { LoginView } from "@/app/giris/LoginView";

export default async function PreviewLogin({ searchParams }: { searchParams: Promise<{ hata?: string; mesaj?: string }> }) {
  const { hata, mesaj } = await searchParams;
  return <LoginView isSignup={false} hata={hata} mesaj={mesaj} />;
}
