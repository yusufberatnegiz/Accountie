import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules, listVendorRules } from "@/db/queries";
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
  const { firm, firms } = await activeFirm(userId);
  const [{ rows, plan }, vendorRules] = await Promise.all([getRules(userId, firm.id), listVendorRules(userId, firm.id)]);
  return (
    <AppShell current="kurallar" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <RulesView key={firm.id} rows={rows} vendorRules={vendorRules} firmName={firm.name} firmId={firm.id} plan={plan} />
    </AppShell>
  );
}
