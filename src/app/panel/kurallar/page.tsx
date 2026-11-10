import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules, listFirmAccounts, listVendorRules } from "@/db/queries";
import { activeFirm } from "@/lib/firm";
import { AppShell } from "@/components/AppShell";
import { RulesView } from "@/components/RulesView";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Hesap kuralları" };
export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const userId = user.id;
  const { firm } = await activeFirm(userId);
  const [{ rows }, vendorRules, plan] = await Promise.all([getRules(userId, firm.id), listVendorRules(userId, firm.id), listFirmAccounts(userId, firm.id)]);
  return (
    <AppShell current="kurallar" email={user.email} firmId={firm.id}>
      <RulesView key={firm.id} rows={rows} vendorRules={vendorRules} firmName={firm.name} plan={plan} />
    </AppShell>
  );
}
