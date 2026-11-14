import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { DeleteAccountView } from "@/components/DeleteAccountForm";
import { getSessionUser } from "@/lib/auth/session";
import { listFirms } from "@/db/queries";

export const metadata: Metadata = { title: "Hesabı sil" };
export const dynamic = "force-dynamic";

export default async function DeleteAccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  return (
    <AppShell current="hesap" email={user.email} setup={!(await listFirms(user.id)).some((f) => f.fromLuca)}>
      <DeleteAccountView />
    </AppShell>
  );
}
