import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRules, listVendorRules, listZDepartments } from "@/db/queries";
import { departmentKey, departmentLabel, type RuleRow } from "@/lib/default-rules";
import { departmentAccounts } from "@/lib/plan-suggest";
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
  const [{ rows: saved, rules, plan }, vendorRules, departments] = await Promise.all([getRules(userId, firm.id), listVendorRules(userId, firm.id), listZDepartments(userId, firm.id)]);
  // Each department the firm's Z reports showed, with the account it goes to now: the one chosen here, else the plan's by its name,
  // else its rate's sales account. Saving one keeps it for this firm.
  const match = departmentAccounts(plan);
  const seen: RuleRow[] = departments.map((d) => ({ d, key: departmentKey(d.name, d.rate) }))
    .filter(({ key }, i, all) => all.findIndex((x) => x.key === key) === i && !saved.some((r) => r.kind === "sales" && r.key === key))
    .map(({ d, key }) => { const a = match(d.name, d.rate) ?? rules.sales.revenue[d.rate] ?? { code: "", name: "" }; return { kind: "sales", key, label: departmentLabel(key), accountCode: a.code, accountName: a.name }; });
  const rows = [...saved, ...seen];
  return (
    <AppShell current="kurallar" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <RulesView key={firm.id} rows={rows} vendorRules={vendorRules} firmName={firm.name} firmId={firm.id} plan={plan} />
    </AppShell>
  );
}
