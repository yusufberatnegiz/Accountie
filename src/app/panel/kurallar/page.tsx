import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules } from "@/db/queries";
import { AppShell } from "@/components/AppShell";
import { RulesView } from "@/components/RulesView";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hesap kuralları" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const userId = user.id;
  const { rows } = await getRules(userId);
  return (
    <AppShell current="kurallar" email={user.email}>
      <RulesView rows={rows} />
    </AppShell>
  );
}
