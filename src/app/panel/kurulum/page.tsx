import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { SetupWizard } from "@/components/SetupWizard";
import { setupStatus } from "@/db/queries";
import { getSessionUser } from "@/lib/auth/session";
import { activeFirm } from "@/lib/firm";

export const metadata: Metadata = { title: "Kurulum" };
export const dynamic = "force-dynamic";

/** First-run setup. It opens on the first step the server cannot see as done: firms from Luca end it, a key means step 3. */
export default async function SetupPage() {
  const user = await getSessionUser();
  if (!user) redirect("/giris");
  const [{ firm, firms }, status] = await Promise.all([activeFirm(user.id), setupStatus(user.id)]);
  const step = status.lucaFirms > 0 ? 4 : status.connected ? 3 : 1;
  return (
    <AppShell current="kurulum" email={user.email} firmId={firm.id} setup={!firms.some((f) => f.fromLuca)}>
      <SetupWizard initialStep={step} initialFirms={status.lucaFirms} />
    </AppShell>
  );
}
