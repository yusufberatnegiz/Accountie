import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { RulesEditor } from "@/components/RulesEditor";
import { getUserId } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hesap kuralları" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const userId = await getUserId();
  if (!userId) redirect("/giris");
  const { rows } = await getRules(userId);
  return (
    <>
      <AppHeader current="kurallar" />
      <main className="page">
        <div className="page-head">
          <div>
            <h1>Hesap kuralları</h1>
            <p>Fiş türü, KDV oranı ve ödeme şekline göre hangi hesabın önerileceğini kendi Luca hesap planınıza göre ayarlayın. Değişiklik yalnızca yeni fişlere uygulanır.</p>
          </div>
        </div>
        <RulesEditor rows={rows} />
      </main>
    </>
  );
}
