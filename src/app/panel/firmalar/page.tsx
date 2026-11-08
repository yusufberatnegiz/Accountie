import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { FirmsView } from "@/components/FirmsView";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";

export const metadata: Metadata = { title: "Firmalar" };
export const dynamic = "force-dynamic";

export default async function FirmsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const { firms, firm } = await activeFirm(user.id);
  return (
    <AppShell current="firmalar" email={user.email}>
      <FirmsView firms={firms} activeId={firm.id} />
    </AppShell>
  );
}
