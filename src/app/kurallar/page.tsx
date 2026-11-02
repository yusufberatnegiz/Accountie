import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules } from "@/db/queries";
import { AppHeader } from "@/components/AppHeader";
import { RulesView } from "@/components/RulesView";
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
      <RulesView rows={rows} />
    </>
  );
}
